// @vitest-environment jsdom
import { DataTexture, Raycaster, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { createHeightmap } from '@europe-historical-atlas/core/data/heightmap'
import { fillTriangles } from '@europe-historical-atlas/core/pipeline/fillTriangles'
import { planeHeight } from '@europe-historical-atlas/core/pipeline/gridDrape'

import { MODE_INDEX, createFillLayer, fillBuffers } from './fillLayer'
import { createReliefMesh, meshVertexGrid, meshWorldDepth } from './reliefMesh'

import type { FillLayerOptions } from './fillLayer'
import type { HeightmapMeta } from '@europe-historical-atlas/core/data/heightmap'

const META: HeightmapMeta = {
  width: 9,
  height: 9,
  zoom: 5,
  bbox: { west: 0, south: 0, east: 10, north: 10 },
  min: 0,
  max: 900,
  encoding: 'int16-le-metres',
}

/** A rough relief: every sample a different height, so no two planes of a cell agree by accident. */
const DEM = createHeightmap(
  META,
  Int16Array.from({ length: 81 }, (_, i) => 100 + ((i * 37) % 11) * 70)
)

const SEGMENTS = 8
const WORLD_WIDTH = 4

/** The real relief, as the atlas builds it. */
const relief = createReliefMesh(DEM, {
  worldWidth: WORLD_WIDTH,
  segments: SEGMENTS,
  plainsCeiling: 2000,
  peakTarget: 3000,
  wireframe: false,
})
const { segX, segY } = meshVertexGrid(META, SEGMENTS)
const GRID = { segX, segY }
const DEPTH = meshWorldDepth(META, WORLD_WIDTH)
const heights = relief.geometry.getAttribute('position')
const nodeY = (ix: number, iy: number): number => heights.getY(iy * (segX + 1) + ix)

/**
 * Where a vertical ray dropped at `(u, v)` meets the real relief mesh.
 * @param u - west→east
 * @param v - north→south
 * @returns the surface height there
 */
function raycastHeight(u: number, v: number): number {
  relief.updateMatrixWorld()
  const x = (u - 0.5) * WORLD_WIDTH
  const z = (v - 0.5) * DEPTH
  const hit = new Raycaster(new Vector3(x, 10, z), new Vector3(0, -1, 0)).intersectObject(relief)[0]
  return hit?.point.y ?? Number.NaN
}

/** A small texture to composite onto. */
const texture = (): DataTexture => new DataTexture(new Uint8Array(16), 2, 2)

/**
 * Options over the real relief, overridable.
 * @param over - what to change
 * @returns the options
 */
const options = (over: Partial<FillLayerOptions> = {}): FillLayerOptions => ({
  fills: fillTriangles(
    [
      {
        rings: [
          [
            { u: 0.1, v: 0.1 },
            { u: 0.9, v: 0.2 },
            { u: 0.4, v: 0.85 },
          ],
        ],
      },
    ],
    GRID
  ),
  tints: [{ r: 200, g: 40, b: 10 }],
  grid: GRID,
  nodeY,
  worldWidth: WORLD_WIDTH,
  worldDepth: DEPTH,
  map: texture(),
  mode: 'overlay',
  strength: 1,
  ...over,
})

describe('planeHeight', () => {
  describe('happy path', () => {
    it('is the height of the real relief mesh under the point, wherever it falls in a cell', () => {
      // The split is asserted against three's own PlaneGeometry, not against our reading of it: a ray
      // dropped onto the built relief must land where the fill puts its vertex (session review ARCH-003).
      for (const [u, v] of [
        [0.13, 0.27],
        [0.61, 0.08],
        [0.5, 0.5],
        [0.88, 0.71],
        [0.33, 0.94],
        [0.0625, 0.1875],
      ] as const)
        expect(planeHeight(u, v, GRID, nodeY)).toBeCloseTo(raycastHeight(u, v), 6)
    })
  })

  describe('variants', () => {
    it('agrees on both sides of a cell diagonal, where the two planes meet', () => {
      // Cell (2, 3): its diagonal runs from (2, 4) to (3, 3) in cells.
      const u = 2.3 / segX
      const v = 3.7 / segY
      expect(planeHeight(u, v, GRID, nodeY)).toBeCloseTo(raycastHeight(u, v), 6)
    })

    it('is the node height on a node', () => {
      expect(planeHeight(3 / segX, 5 / segY, GRID, nodeY)).toBeCloseTo(nodeY(3, 5), 9)
    })
  })

  // L3 (managed errors): N/A — it reads a grid of heights and returns one; nothing can be refused.

  describe('unmanaged errors', () => {
    it('carries a NaN height through rather than putting the fill at sea level', () => {
      expect(planeHeight(0.5, 0.5, GRID, () => Number.NaN)).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('clamps a point past the far edge onto the last row and column', () => {
      expect(planeHeight(1, 1, GRID, nodeY)).toBeCloseTo(nodeY(segX, segY), 9)
      expect(planeHeight(1.2, -0.1, GRID, nodeY)).toBeCloseTo(nodeY(segX, 0), 9)
    })
  })
})

describe('fillBuffers', () => {
  it('lays every vertex on the relief and paints it its polity tint', () => {
    const { positions, tints } = fillBuffers(options())
    expect(positions.length).toBeGreaterThan(0)
    for (let k = 0; k < positions.length; k += 3) {
      const u = (positions[k] ?? 0) / WORLD_WIDTH + 0.5
      const v = (positions[k + 2] ?? 0) / DEPTH + 0.5
      expect(positions[k + 1]).toBeCloseTo(raycastHeight(u, v), 5)
    }
    expect(Array.from(tints.slice(0, 3))).toEqual([200, 40, 10])
  })

  it('leaves out a polity with no tint', () => {
    const { positions } = fillBuffers(options({ tints: [null] }))
    expect(positions.length).toBe(0)
  })
})

describe('MODE_INDEX', () => {
  it('numbers the four blend modes as the shader switches on them', () => {
    // blend() in the fragment shader: 1 multiply, 2 overlay, 3 softLight, anything else normal. GLSL
    // cannot import blendChannel, so the numbering is the contract between the two copies.
    expect(MODE_INDEX).toEqual({ normal: 0, multiply: 1, overlay: 2, softLight: 3 })
  })
})

describe('createFillLayer', () => {
  describe('happy path', () => {
    it('builds one mesh drawn after the relief, pulled forward in depth to win against it', () => {
      const layer = createFillLayer(options())
      expect(layer.object.renderOrder).toBeGreaterThan(relief.renderOrder)
      expect(layer.object.material.polygonOffset).toBe(true)
      expect(layer.object.material.polygonOffsetFactor).toBeLessThan(0)
      layer.dispose()
    })
  })

  describe('variants', () => {
    it('follows a new texture and a new blend without a rebuild', () => {
      const layer = createFillLayer(options())
      const next = texture()
      layer.setMap(next)
      layer.setLook('multiply', 0.4)
      expect(layer.object.material.uniforms.map?.value).toBe(next)
      expect(layer.object.material.uniforms.mode?.value).toBe(1)
      expect(layer.object.material.uniforms.strength?.value).toBe(0.4)
      layer.dispose()
    })
  })

  describe('managed errors', () => {
    it('builds an empty mesh when no polity has a tint', () => {
      const layer = createFillLayer(options({ tints: [null] }))
      expect(layer.object.geometry.getAttribute('position').count).toBe(0)
      layer.dispose()
    })
  })

  // L4 (unmanaged errors): N/A — no asynchronous work, no outside source; a missing uniform is a
  // programming error and throws, which `setLook`'s own test would show the day one is renamed.

  describe('edge cases', () => {
    it('frees its geometry and material on dispose', () => {
      const layer = createFillLayer(options())
      let freed = 0
      layer.object.geometry.addEventListener('dispose', () => (freed += 1))
      layer.object.material.addEventListener('dispose', () => (freed += 1))
      layer.dispose()
      expect(freed).toBe(2)
    })
  })
})
