// @vitest-environment jsdom
import { DataTexture, Raycaster, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { createHeightmap } from '@europe-historical-atlas/core/data/heightmap'
import { fillTriangles } from '@europe-historical-atlas/core/pipeline/fillTriangles'
import { planeHeight } from '@europe-historical-atlas/core/pipeline/gridDrape'

import { createReliefMesh, meshVertexGrid, meshWorldDepth } from '../../relief/reliefMesh'
import { MODE_INDEX } from '../tintOnRelief'

import { fillBuffers } from './fillBuffers'
import { createFillLayer } from './fillLayer'
import { fillVertexShader, tintAttribute } from './fillShader'

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
  tintLevels: [[{ r: 200, g: 40, b: 10 }]],
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

/** Two polities, one per triangle: a suzerain and its vassal. */
const twoPolities = (): FillLayerOptions['fills'] =>
  fillTriangles(
    [
      {
        rings: [
          [
            { u: 0.1, v: 0.1 },
            { u: 0.4, v: 0.1 },
            { u: 0.1, v: 0.4 },
          ],
        ],
      },
      {
        rings: [
          [
            { u: 0.6, v: 0.6 },
            { u: 0.9, v: 0.6 },
            { u: 0.6, v: 0.9 },
          ],
        ],
      },
    ],
    GRID
  )

const LORD = { r: 10, g: 20, b: 30 }
const VASSAL = { r: 200, g: 100, b: 50 }

describe('fillBuffers', () => {
  describe('happy path', () => {
    it('lays every vertex on the relief and paints it its polity tint', () => {
      const { positions, tints } = fillBuffers(options())
      expect(positions.length).toBeGreaterThan(0)
      for (let k = 0; k < positions.length; k += 3) {
        const u = (positions[k] ?? 0) / WORLD_WIDTH + 0.5
        const v = (positions[k + 2] ?? 0) / DEPTH + 0.5
        expect(positions[k + 1]).toBeCloseTo(raycastHeight(u, v), 5)
      }
      expect(tints).toHaveLength(1)
      expect(Array.from(tints[0]?.slice(0, 3) ?? [])).toEqual([200, 40, 10])
    })
  })

  describe('variants', () => {
    it('writes one tint buffer per level, the vassal in its lord’s colour at level 0', () => {
      const fills = twoPolities()
      const { positions, tints } = fillBuffers(
        options({
          fills,
          tintLevels: [
            [LORD, LORD],
            [LORD, VASSAL],
          ],
        })
      )
      const lordVertices = Math.floor((fills[0]?.length ?? 0) / 2)
      const last = positions.length - 3
      expect(tints).toHaveLength(2)
      expect(Array.from(tints[0]?.slice(last, last + 3) ?? [])).toEqual([10, 20, 30])
      expect(Array.from(tints[1]?.slice(last, last + 3) ?? [])).toEqual([200, 100, 50])
      expect(Array.from(tints[1]?.slice(0, 3) ?? [])).toEqual([10, 20, 30])
      expect(lordVertices).toBeGreaterThan(0)
    })
  })

  describe('managed errors', () => {
    it('leaves out a polity with no tint at the deepest level', () => {
      const { positions } = fillBuffers(options({ tintLevels: [[null]] }))
      expect(positions.length).toBe(0)
    })

    it('leaves a polity out of every level when its deepest tint is null', () => {
      const { positions, tints } = fillBuffers(
        options({
          fills: twoPolities(),
          tintLevels: [
            [LORD, null],
            [LORD, null],
          ],
        })
      )
      expect(tints[0]?.length).toBe(positions.length)
      expect(tints[1]?.length).toBe(positions.length)
    })
  })

  describe('unmanaged errors', () => {
    it('throws when no level is given', () => {
      expect(() => fillBuffers(options({ tintLevels: [] }))).toThrow(/no tint level/)
    })

    it('throws when a filled polity has no tint at a lower level', () => {
      expect(() =>
        fillBuffers(
          options({
            fills: twoPolities(),
            tintLevels: [
              [LORD, null],
              [LORD, VASSAL],
            ],
          })
        )
      ).toThrow(/polity 1 is filled but has no tint at level 0/)
    })
  })

  describe('edge cases', () => {
    it('writes nothing for no polity', () => {
      const { positions, tints } = fillBuffers(options({ fills: [], tintLevels: [[], []] }))
      expect(positions.length).toBe(0)
      expect(tints.map((bytes) => bytes.length)).toEqual([0, 0])
    })
  })
})

describe('fillVertexShader', () => {
  it('declares one tint attribute per level and compiles the count in', () => {
    const source = fillVertexShader(3)
    expect(source).toContain('#define LEVELS 3')
    for (const level of [0, 1, 2])
      expect(source).toContain(`attribute vec3 ${tintAttribute(level)};`)
    expect(source).not.toContain('tint3')
  })

  it('mixes the two levels around the detail uniform', () => {
    expect(fillVertexShader(2)).toMatch(
      /mix\(tintAt\(below\), tintAt\(min\(below \+ 1\.0, top\)\), d - below\)/
    )
  })

  it('reads one level as a single attribute', () => {
    const source = fillVertexShader(1)
    expect(source).toContain('#define LEVELS 1')
    expect(source).toContain('return tint0;')
    expect(source).not.toContain('tint1')
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

    it('carries one attribute per level and opens on the deepest, every polity in its own colour', () => {
      const layer = createFillLayer(
        options({
          fills: twoPolities(),
          tintLevels: [
            [LORD, LORD],
            [LORD, VASSAL],
          ],
        })
      )
      expect(layer.object.geometry.getAttribute('tint0')).toBeDefined()
      expect(layer.object.geometry.getAttribute('tint1')).toBeDefined()
      expect(layer.object.material.uniforms.detail?.value).toBe(1)
      layer.dispose()
    })

    it('follows the zoom’s detail without touching the geometry', () => {
      const layer = createFillLayer(
        options({
          fills: twoPolities(),
          tintLevels: [
            [LORD, LORD],
            [LORD, VASSAL],
          ],
        })
      )
      const before = layer.object.geometry.getAttribute('tint0')
      layer.setDetail(0.25)
      expect(layer.object.material.uniforms.detail?.value).toBe(0.25)
      expect(layer.object.geometry.getAttribute('tint0')).toBe(before)
      layer.dispose()
    })
  })

  describe('managed errors', () => {
    it('builds an empty mesh when no polity has a tint', () => {
      const layer = createFillLayer(options({ tintLevels: [[null]] }))
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
