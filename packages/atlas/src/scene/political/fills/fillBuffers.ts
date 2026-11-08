/**
 * The fills' geometry: every filled triangle placed on the relief, with its polity's tint at each level of homage.
 */

import { planeHeightIn } from '@europe-historical-atlas/core/pipeline/gridDrape'

import type { TintSurface } from '../tintOnRelief'
import type { RgbColor } from '@europe-historical-atlas/core/utils/color'

/** What the fills' geometry is built from: the triangles, their tints by level, and the surface. */
export interface FillGeometry extends TintSurface {
  /** Each polity's triangles, flat `u, v`, three vertices each — `fillTriangles`' output. */
  fills: readonly Float32Array[]
  /**
   * Each display level's tints, level 0 first, each one per polity in the fills' order. The last level
   * decides what is filled: `null` there leaves the polity unfilled at every level. A year with no homage
   * to reveal — a payload year — has one level.
   */
  tintLevels: readonly (readonly (RgbColor | null)[])[]
}

/**
 * The positions and per-level tints of every filled triangle, in world space.
 *
 * Two passes: the first counts the vertices of the filled polities, so every buffer is allocated once at
 * its exact size; the second resolves each polity's tints and writes its vertices.
 * @param options - the fills, their tints by level and the surface
 * @returns three floats per vertex, and three bytes per vertex for each level
 * @throws when no level is given, or when a filled polity has no tint at a lower level — the levels are
 *   built from one registry, so either is a defect, and a guessed colour would paint a vassal in nobody's
 */
export function fillBuffers(options: FillGeometry): {
  positions: Float32Array
  tints: Uint8Array[]
} {
  // The deepest level decides which polities are filled at all.
  const levels = options.tintLevels
  const deepest = levels[levels.length - 1]
  if (deepest === undefined) throw new Error('fill layer: no tint level given')
  // 1. Count the vertices of the filled polities, so every buffer is allocated at its exact size.
  let vertices = 0
  options.fills.forEach((fill, i) => {
    if (deepest[i]) vertices += Math.floor(fill.length / 2)
  })
  // 2. One position buffer, and one tint buffer per level.
  const positions = new Float32Array(vertices * 3)
  const tints = levels.map(() => new Uint8Array(vertices * 3))
  // 3. Write each filled polity's vertices and tints, one polity after the other.
  let at = 0
  options.fills.forEach((fill, i) => {
    if (!deepest[i]) return
    at = writeFill(fill, polityTints(levels, i), { positions, tints }, at, options)
  })
  return { positions, tints }
}

/**
 * One filled polity's tint at every level.
 * @param levels - each level's tints, one per polity
 * @param polity - the polity's index in the fills
 * @returns its tint at each level, level 0 first
 * @throws when it has no tint at some level — the levels are built from one registry, so a defect
 */
function polityTints(levels: FillGeometry['tintLevels'], polity: number): RgbColor[] {
  return levels.map((level, k) => {
    const tint = level[polity]
    if (!tint)
      throw new Error(
        `fill layer: polity ${String(polity)} is filled but has no tint at level ${String(k)}`
      )
    return tint
  })
}

/**
 * Write one polity's vertices: each placed on the relief, then its tint at every level over the whole run.
 *
 * One tight loop per buffer, no call per vertex but the plane's (ATLAS-333): the 2.17 million vertices of 1100 took
 * ~420 ms of the page in Chrome when each read its four nodes through a reader and wrote its tints through a
 * `forEach` (measured 2026-11-08).
 * @param fill - the polity's triangles, flat `u, v`
 * @param own - its tint at every level
 * @param buffers - the buffers, written in place
 * @param buffers.positions - three floats per vertex
 * @param buffers.tints - three bytes per vertex, one array per level
 * @param at - the first vertex to write
 * @param surface - the surface the vertices are laid on
 * @returns the vertex after the last one written
 */
function writeFill(
  fill: Float32Array,
  own: readonly RgbColor[],
  buffers: { positions: Float32Array; tints: readonly Uint8Array[] },
  at: number,
  surface: TintSurface
): number {
  const { positions, tints } = buffers
  const { grid, nodes, worldWidth, worldDepth } = surface
  // Whole vertices only: a trailing lone float would be half a vertex, and is skipped.
  const count = Math.floor(fill.length / 2)
  for (let i = 0; i < count; i++) {
    // Indices the loop keeps in range (`noUncheckedIndexedAccess`): the `NaN` never stands in for anything.
    const u = fill[2 * i] ?? Number.NaN
    const v = fill[2 * i + 1] ?? Number.NaN
    // Place the vertex in world space, its height read from the plane of the relief cell under it.
    const p = 3 * (at + i)
    positions[p] = (u - 0.5) * worldWidth
    positions[p + 1] = planeHeightIn(u, v, grid, nodes)
    positions[p + 2] = (v - 0.5) * worldDepth
  }
  // Its polity's tint at every level, over the whole run.
  own.forEach((tint, level) => {
    const bytes = tints[level]
    if (bytes) paintRun(bytes, tint, at, count)
  })
  return at + count
}

/**
 * One colour over a run of vertices, three bytes each.
 * @param bytes - the tint buffer
 * @param tint - the colour
 * @param from - the first vertex
 * @param count - how many vertices
 */
function paintRun(bytes: Uint8Array, tint: RgbColor, from: number, count: number): void {
  const { r, g, b } = tint
  const end = 3 * (from + count)
  for (let p = 3 * from; p < end; p += 3) {
    bytes[p] = r
    bytes[p + 1] = g
    bytes[p + 2] = b
  }
}
