/**
 * The fills' geometry: every filled triangle placed on the relief, with its polity's tint at each level of homage — and
 * a vassal's band (ATLAS-398): its depth of homage and each vertex's distance to its outline.
 */

import { planeHeightIn } from '@europe-historical-atlas/core/pipeline/gridDrape'

import type { TintSurface } from '../tintOnRelief'
import type { IndexedFill } from '@europe-historical-atlas/core/pipeline/indexFill'
import type { RgbColor } from '@europe-historical-atlas/core/utils/color'

/** What the fills' geometry is built from: the triangles, their tints by level, and the surface. */
export interface FillGeometry extends TintSurface {
  /** Each polity's triangles, their vertices shared — the cut's output (`indexFill`). */
  fills: readonly IndexedFill[]
  /**
   * Each display level's tints, level 0 first, each one per polity in the fills' order. The last level
   * decides what is filled: `null` there leaves the polity unfilled at every level. A year with no homage
   * to reveal — a payload year — has one level.
   */
  tintLevels: readonly (readonly (RgbColor | null)[])[]
  /**
   * Each polity's band depth, in the fills' order (`core/data/vassalBand`): its depth of homage when it wears the
   * vassals' band — its fill then carries its distances (`bandKm`) — `0` for a polity that wears none.
   */
  bandDepths: readonly number[]
}

/** The buffers of the fills' geometry. */
export interface FillBufferSet {
  /** Three floats per vertex, in world space. */
  positions: Float32Array
  /** Three bytes per vertex for each level of homage, level 0 first. */
  tints: Uint8Array[]
  /** Each vertex's polity band depth, `0` for a sovereign — one byte a vertex. */
  bandDepth: Uint8Array
  /** Each vertex's signed distance to its vassal's outline, km; `0` for a sovereign, whose depth says it is unread. */
  bandKm: Float32Array
  /** Three indices per triangle. */
  indices: Uint32Array
}

/**
 * The positions and per-level tints of every filled polity's vertices, in world space, and its triangles as indices.
 *
 * Two passes: the first counts the vertices and indices of the filled polities, so every buffer is allocated once at
 * its exact size; the second resolves each polity's tints and writes its vertices and its triangles. A vertex is never
 * shared between two polities: each has its own tints.
 * @param options - the fills, their tints by level, their band depths and the surface
 * @returns three floats per vertex, three bytes per vertex for each level, the band's depth and distance per vertex,
 *   and three indices per triangle
 * @throws when no level is given, or when a filled polity has no tint at a lower level — the levels are
 *   built from one registry, so either is a defect, and a guessed colour would paint a vassal in nobody's; and when a
 *   banded polity's fill was cut without its distances, or has no depth — the cut and the settling read one registry
 */
export function fillBuffers(options: FillGeometry): FillBufferSet {
  // The deepest level decides which polities are filled at all.
  const levels = options.tintLevels
  const deepest = levels[levels.length - 1]
  if (deepest === undefined) throw new Error('fill layer: no tint level given')
  // 1. Count the vertices and indices of the filled polities, so every buffer is allocated at its exact size.
  let vertices = 0
  let corners = 0
  options.fills.forEach((fill, i) => {
    if (!deepest[i]) return
    vertices += Math.floor(fill.vertices.length / 2)
    corners += fill.indices.length
  })
  // 2. One position buffer, one tint buffer per level, one index buffer.
  const positions = new Float32Array(vertices * 3)
  const tints = levels.map(() => new Uint8Array(vertices * 3))
  const bandDepth = new Uint8Array(vertices)
  const bandKm = new Float32Array(vertices)
  const indices = new Uint32Array(corners)
  // 3. Write each filled polity's triangles, vertices and tints, one polity after the other.
  let at = 0
  let corner = 0
  options.fills.forEach((fill, i) => {
    if (!deepest[i]) return
    // Its triangles, shifted past the vertices of the polities written before it.
    for (const index of fill.indices) indices[corner++] = at + index
    writeBand(fill, polityBandDepth(options.bandDepths, i), { bandDepth, bandKm }, at)
    at = writeFill(fill.vertices, polityTints(levels, i), { positions, tints }, at, options)
  })
  return { positions, tints, bandDepth, bandKm, indices }
}

/**
 * One filled polity's band depth.
 * @param depths - each polity's band depth
 * @param polity - the polity's index in the fills
 * @returns its depth, `0` for none
 * @throws when it has none — the depths are settled one per region, so a defect
 */
function polityBandDepth(depths: readonly number[], polity: number): number {
  const depth = depths[polity]
  if (depth === undefined)
    throw new Error(`fill layer: polity ${String(polity)} is filled but has no band depth`)
  return depth
}

/**
 * Write one polity's band: its depth over its whole run, and a vassal's distances.
 * @param fill - the polity's fill, a vassal's with its distances
 * @param depth - its band depth, `0` for a sovereign
 * @param buffers - the buffers, written in place
 * @param buffers.bandDepth - one byte per vertex
 * @param buffers.bandKm - one float per vertex
 * @param at - the first vertex to write
 * @throws when a banded polity has no distances, or not one per vertex — its cut was not measured for the band
 */
function writeBand(
  fill: IndexedFill,
  depth: number,
  buffers: { bandDepth: Uint8Array; bandKm: Float32Array },
  at: number
): void {
  // A sovereign's run stays nought: its depth says the distance is not read.
  if (depth === 0) return
  const count = Math.floor(fill.vertices.length / 2)
  if (fill.bandKm?.length !== count)
    throw new Error(
      `fill layer: a vassal of depth ${String(depth)} was cut without its band's distances`
    )
  buffers.bandDepth.fill(depth, at, at + count)
  buffers.bandKm.set(fill.bandKm, at)
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
 * `forEach` (measured 2026-11-08) — and shared, a fifth as many are placed.
 * @param fill - the polity's distinct vertices, flat `u, v`
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
