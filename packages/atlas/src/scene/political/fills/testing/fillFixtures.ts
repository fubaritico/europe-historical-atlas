/**
 * The fills' test fixtures: a rough relief built as the atlas builds it, one polity's options laid over it, and a
 * suzerain and its vassal with their tints.
 */

import { DataTexture, Raycaster, Vector3 } from 'three'

import { createHeightmap } from '@europe-historical-atlas/core/data/heightmap'
import { fillTriangles } from '@europe-historical-atlas/core/pipeline/fillTriangles'

import { createReliefMesh, meshVertexGrid, meshWorldDepth } from '../../../relief/reliefMesh'

import type { FillLayerOptions } from '../fillLayer'
import type { HeightmapMeta } from '@europe-historical-atlas/core/data/heightmap'

/** A nine-by-nine elevation frame. */
export const META: HeightmapMeta = {
  width: 9,
  height: 9,
  zoom: 5,
  bbox: { west: 0, south: 0, east: 10, north: 10 },
  min: 0,
  max: 900,
  encoding: 'int16-le-metres',
}

/** A rough relief: every sample a different height, so no two planes of a cell agree by accident. */
export const DEM = createHeightmap(
  META,
  Int16Array.from({ length: 81 }, (_, i) => 100 + ((i * 37) % 11) * 70)
)

/** How finely the relief is cut, in cells across. */
export const SEGMENTS = 8
/** How wide the map is in world units — small, so the numbers stay readable. */
export const WORLD_WIDTH = 4

/** The real relief, as the atlas builds it. */
export const relief = createReliefMesh(DEM, {
  worldWidth: WORLD_WIDTH,
  segments: SEGMENTS,
  plainsCeiling: 2000,
  peakTarget: 3000,
  wireframe: false,
})
/** The relief's cells, across and down. */
export const { segX, segY } = meshVertexGrid(META, SEGMENTS)
/** The same, as the grid the fills are cut against. */
export const GRID = { segX, segY }
/** How deep the map is in world units. */
export const DEPTH = meshWorldDepth(META, WORLD_WIDTH)
/** The relief's vertex positions, read for its node heights. */
export const heights = relief.geometry.getAttribute('position')
/**
 * The relief mesh's height at a grid node.
 * @param ix - the node's column
 * @param iy - the node's row
 * @returns its height
 */
export const nodeY = (ix: number, iy: number): number => heights.getY(iy * (segX + 1) + ix)

/**
 * Where a vertical ray dropped at `(u, v)` meets the real relief mesh.
 * @param u - west→east
 * @param v - north→south
 * @returns the surface height there
 */
export function raycastHeight(u: number, v: number): number {
  relief.updateMatrixWorld()
  const x = (u - 0.5) * WORLD_WIDTH
  const z = (v - 0.5) * DEPTH
  const hit = new Raycaster(new Vector3(x, 10, z), new Vector3(0, -1, 0)).intersectObject(relief)[0]
  return hit?.point.y ?? Number.NaN
}

/**
 * A small texture to composite onto.
 * @returns it
 */
export const texture = (): DataTexture => new DataTexture(new Uint8Array(16), 2, 2)

/**
 * Options over the real relief, overridable.
 * @param over - what to change
 * @returns the options
 */
export const options = (over: Partial<FillLayerOptions> = {}): FillLayerOptions => ({
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

/**
 * Two polities, one per triangle: a suzerain and its vassal.
 * @returns their triangles
 */
export const twoPolities = (): FillLayerOptions['fills'] =>
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

/** The suzerain's tint. */
export const LORD = { r: 10, g: 20, b: 30 }

/** Its vassal's own tint, shown when the zoom reveals it. */
export const VASSAL = { r: 200, g: 100, b: 50 }
