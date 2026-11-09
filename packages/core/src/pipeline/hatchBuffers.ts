/**
 * The hatches' geometry (ATLAS-399): every piece of common ground cut on the relief's planes, as a fill is, its
 * vertices laid at the relief's height — each carrying the colours of the polities covering it and how many there are,
 * so the shader picks one per stripe.
 *
 * The cut and the laying are the fills' own (`cutYearFills`, `fillBuffers`), so a hatched piece covers exactly the ground
 * the two fills overlapped on. A handful of small pieces a year (25 in 1100), so it is cut where it is asked for.
 */

import { HATCH_MAX_COLOURS } from '../data/hatchStripes'

import { fillBuffers } from './fillBuffers'
import { cutYearFills } from './vassalBands'

import type { FillSurface } from './fillBuffers'
import type { FillBand } from './vassalBands'
import type { OverlapHatch } from '../data/overlapHatches'
import type { RgbColor } from '../utils/color'

/** The hatches' geometry, ready to be wrapped in buffers. */
export interface HatchArrays {
  /** Each vertex's band depth — its piece's vassal's depth of homage, `0` for none (ATLAS-398) — one byte a vertex. */
  bandDepth: Uint8Array
  /** Each vertex's signed distance to its piece's outline, km. */
  bandKm: Float32Array
  /** The same — a contested piece is its own realm's outline, from afar as close up. */
  realmKm: Float32Array
  /** Three floats per vertex, in world space. */
  positions: Float32Array
  /** Three bytes per vertex for each of the {@link HATCH_MAX_COLOURS} colours, the first polity's first. */
  colours: Uint8Array[]
  /** How many colours take turns on each vertex's piece, `2` to {@link HATCH_MAX_COLOURS} — one byte a vertex. */
  counts: Uint8Array
  /** Three indices per triangle. */
  indices: Uint32Array
}

/**
 * Write one colour over a run of vertices, three bytes each.
 * @param bytes - the colour's buffer
 * @param colour - the colour
 * @param from - the first vertex
 * @param count - how many vertices
 */
function paint(bytes: Uint8Array, colour: RgbColor, from: number, count: number): void {
  for (let vertex = from; vertex < from + count; vertex++) {
    bytes[3 * vertex] = colour.r
    bytes[3 * vertex + 1] = colour.g
    bytes[3 * vertex + 2] = colour.b
  }
}

/**
 * Lay a year's hatches on the relief.
 * @param hatches - the pieces of common ground, in their polities' colours
 * @param surface - the relief they are laid on
 * @param warn - where a piece of more than {@link HATCH_MAX_COLOURS} polities is said: its first ones take turns
 * @param band - the frame and the reach a vassal's piece is measured with — against the piece's own outline, which is
 *   the vassal's when the whole of it is contested (the dev's case, 2026-11-09); `null` measures none
 * @returns the hatches' arrays
 */
export function hatchBuffers(
  hatches: readonly OverlapHatch[],
  surface: FillSurface,
  warn: (message: string) => void,
  band: FillBand | null
): HatchArrays {
  const fills = cutYearFills(
    // Every piece measured: a sovereigns' piece wears the sovereigns' band, a vassal's the vassals' (the dev's trial).
    hatches.map(({ rings }) => (band === null ? { rings } : { rings, banded: true })),
    surface.grid,
    band
  )
  // The fills' own laying, every piece in one placeholder tint, so the positions and indices are the fills' exactly.
  const { positions, indices, bandDepth, bandKm, realmKm } = fillBuffers({
    ...surface,
    fills,
    tintLevels: [hatches.map(() => ({ r: 0, g: 0, b: 0 }))],
    bandDepths: band === null ? hatches.map(() => 0) : hatches.map(({ bandDepth }) => bandDepth),
  })
  const vertices = positions.length / 3
  const colours = Array.from({ length: HATCH_MAX_COLOURS }, () => new Uint8Array(vertices * 3))
  const counts = new Uint8Array(vertices)
  let at = 0
  hatches.forEach((hatch, i) => {
    // One fill per piece, cut from the pieces themselves: a missing one is a defect, never an empty run (review QUAL-002).
    const fill = fills[i]
    if (fill === undefined) throw new Error(`[atlas] hatch ${String(i)} was cut into no fill`)
    const run = Math.floor(fill.vertices.length / 2)
    if (hatch.colours.length > HATCH_MAX_COLOURS)
      warn(
        `[atlas] ${String(hatch.colours.length)} polities overlap on one piece (${hatch.polities.join(', ')}): only the first ${String(HATCH_MAX_COLOURS)} are striped`
      )
    const taken = hatch.colours.slice(0, HATCH_MAX_COLOURS)
    taken.forEach((colour, k) => {
      const bytes = colours[k]
      if (bytes !== undefined) paint(bytes, colour, at, run)
    })
    counts.fill(taken.length, at, at + run)
    at += run
  })
  return { positions, colours, counts, bandDepth, bandKm, realmKm, indices }
}
