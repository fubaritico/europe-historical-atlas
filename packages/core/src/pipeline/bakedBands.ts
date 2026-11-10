/**
 * **The bands' distances computed at the site's build** (ATLAS-407, the dev, 2026-11-10): every banded vertex's signed
 * distance to its polity's outline and to its realm's — what the fill shader draws the sovereigns', the vassals' and the
 * realm's bands from — measured once by the build rather than at each opening of a map, where it cost 0.8 to 1.6 s
 * (`files/plans/atlas/band-distances-at-build.md`).
 *
 * **One byte a distance, in steps of a third of a kilometre**, clamped to ±127 steps (±42⅓ km, past `BAND_REACH_KM`):
 * a band 10 or 20 km wide drawn over cells ~7 km across shows nothing finer; a year is 0.9 to 1.2 MB, gzipped by the
 * build to 300–400 kB (`bake/bandsBake`).
 *
 * **Per vertex, in the cut's own order**, not an image: two polities' fills overlap on contested ground, and one pixel
 * could not hold both their distances.
 *
 * **Checked polity by polity** (the dev, 2026-11-10): the build runs in Node, the page in the browser, and the two do not
 * compute the projection's logarithm and tangent to the same last digit (measured on 200,000 latitudes) — which is enough
 * to add or drop a few vertices of the cut (1100: 441,721 in Node, 441,717 in Chrome). So the file holds, for each polity,
 * its count of vertices and a print of where they lie; a polity whose cut does not match is **measured on the page, it
 * alone**, so its distances stay exact — a few hundredths of a second, said in the console. A projection giving the same
 * digits everywhere would make that measure needless: CORE-412.
 *
 * **No fallback for a file** (the dev, 2026-11-10: *"why would the file be missing?"*): the built site always has it, the
 * dev server never reads it and measures as before. A file for another grid or another count of polities is refused.
 *
 * Layout, little-endian: `EHAB`, the version (a byte), the steps per km (a byte), two bytes of nought, the grid's cells
 * across and down, the count of polities and of distances (four `uint32`); then each polity's count of vertices and print
 * (two `uint32`); then every own distance, then every realm distance (`int8` each), the polities in turn.
 */

import type { FillGrid } from './fillTriangles'
import type { IndexedFill } from './indexFill'

/** The file's name, in a year's folder. */
export const BAKED_BANDS_FILE = 'bands.bin'

/** The format's version: a file of another one is refused. */
export const BAKED_BANDS_VERSION = 2

/** How many steps a kilometre is cut into — a step is a third of a kilometre. */
export const BAND_STEPS_PER_KM = 3

/** The four bytes that open the file. */
const MAGIC = [0x45, 0x48, 0x41, 0x42] as const

/** The header's size, in bytes. */
const HEADER_BYTES = 24

/** Each polity's entry: its count of vertices and its print. */
const POLITY_BYTES = 8

/** The widest distance a byte holds, in steps. */
const MAX_STEPS = 127

/**
 * How finely a vertex is placed in its print: 2²⁰ steps across the frame, a millionth of it. Coarse enough that a
 * difference in the last digit moves no vertex; fine enough that a vertex moved by the cut is seen.
 */
const PRINT_STEPS = 1 << 20

/** A polity's entry in the file. */
export interface BakedPolity {
  /** Its count of banded vertices — nought for a polity that wears no band. */
  readonly count: number
  /** Where they lie, folded into a number ({@link vertexPrint}). */
  readonly print: number
}

/** A year's distances as the build wrote them. */
export interface BakedBands {
  /** The grid the fills were cut on: the vertices are that cut's. */
  readonly grid: FillGrid
  /** Each region's entry, in the regions' order. */
  readonly polities: readonly BakedPolity[]
  /** Every banded vertex's distance to its own outline, in steps, the polities in turn. */
  readonly own: Int8Array
  /** Every banded vertex's distance to its realm's outline, in steps — its own outline's for a polity alone in its realm. */
  readonly realm: Int8Array
}

/** A year's fills with the build's distances laid, and the polities whose cut did not match. */
export interface LaidBands {
  /** The fills, each matching banded polity's with its `bandKm` and `realmKm`; the others as they came. */
  readonly fills: IndexedFill[]
  /** The indices of the banded polities whose cut differs from the build's — to be measured on the page. */
  readonly unmatched: number[]
}

/**
 * Where a year's baked distances live under a folder of years — the one path the build writes and the page reads.
 * @param yearsBase - the folder of the years, e.g. `/years` for the page, `years` for the build's output
 * @param year - the year
 * @returns the file's path
 */
export function bakedBandsPath(yearsBase: string, year: number): string {
  return `${yearsBase.replace(/\/$/, '')}/${String(year)}/${BAKED_BANDS_FILE}`
}

/**
 * Where a fill's vertices lie, folded into one number — whole-number arithmetic only, so the build and the page fold it
 * alike; the vertices placed to a millionth of the frame, their order counted.
 * @param fill - the fill
 * @returns the print, an unsigned 32-bit number
 */
export function vertexPrint(fill: Pick<IndexedFill, 'vertices'>): number {
  let print = 0x811c9dc5
  for (const coordinate of fill.vertices) {
    print = Math.imul(print ^ Math.round(coordinate * PRINT_STEPS), 0x01000193)
  }
  return print >>> 0
}

/**
 * A distance in steps.
 * @param km - the distance, km
 * @returns its steps, clamped to a byte
 */
function toSteps(km: number): number {
  return Math.max(-MAX_STEPS, Math.min(MAX_STEPS, Math.round(km * BAND_STEPS_PER_KM)))
}

/**
 * Write a fill's distances in steps, from a place in the file's runs.
 * @param fill - the fill, its distances measured or none
 * @param runs - the own and the realm distances of the whole file
 * @param runs.own - every own distance, in steps
 * @param runs.realm - every realm distance, in steps
 * @param at - where the fill's run starts
 * @returns where the next fill's starts
 * @throws when a distance is not a number — a broken measure, never written as a plausible one
 */
function writeDistances(
  fill: IndexedFill,
  runs: { own: Int8Array; realm: Int8Array },
  at: number
): number {
  const { bandKm, realmKm } = fill
  if (bandKm === undefined) return at
  for (let i = 0; i < bandKm.length; i++) {
    // Indices the loop keeps in range (`noUncheckedIndexedAccess`): the `NaN` stands in for nothing, it is refused.
    const ownKm = bandKm[i] ?? Number.NaN
    const realmOf = realmKm === undefined ? ownKm : (realmKm[i] ?? Number.NaN)
    if (Number.isNaN(ownKm) || Number.isNaN(realmOf))
      throw new Error(`baked bands: vertex ${String(at + i)} has a distance that is not a number`)
    runs.own[at + i] = toSteps(ownKm)
    runs.realm[at + i] = toSteps(realmOf)
  }
  return at + bandKm.length
}

/**
 * Write a year's distances, from its fills as the cut measured them.
 * @param fills - the fills, measured (`measureVassalBands`), in the regions' order — one per region
 * @param grid - the grid they were cut on
 * @returns the file's bytes
 * @throws when a distance is not a number — a broken measure, never written as a plausible one
 */
export function encodeBakedBands(fills: readonly IndexedFill[], grid: FillGrid): Uint8Array {
  const total = fills.reduce((sum, fill) => sum + (fill.bandKm?.length ?? 0), 0)
  const start = HEADER_BYTES + POLITY_BYTES * fills.length
  const bytes = new Uint8Array(start + 2 * total)
  const view = new DataView(bytes.buffer)
  bytes.set(MAGIC, 0)
  view.setUint8(4, BAKED_BANDS_VERSION)
  view.setUint8(5, BAND_STEPS_PER_KM)
  view.setUint32(8, grid.segX, true)
  view.setUint32(12, grid.segY, true)
  view.setUint32(16, fills.length, true)
  view.setUint32(20, total, true)
  const own = new Int8Array(bytes.buffer, start, total)
  const realm = new Int8Array(bytes.buffer, start + total, total)
  let at = 0
  fills.forEach((fill, index) => {
    const entry = HEADER_BYTES + POLITY_BYTES * index
    view.setUint32(entry, fill.bandKm?.length ?? 0, true)
    view.setUint32(entry + 4, fill.bandKm === undefined ? 0 : vertexPrint(fill), true)
    at = writeDistances(fill, { own, realm }, at)
  })
  return bytes
}

/**
 * Read a year's distances.
 * @param buffer - the file's bytes
 * @param where - the file, for the message
 * @returns the grid, the polities' entries and the distances
 * @throws when the bytes are not a year's baked distances of this version — never used half-read
 */
export function readBakedBands(buffer: ArrayBuffer, where: string): BakedBands {
  const refuse = (why: string): Error =>
    new Error(`${where} is not a year's baked distances: ${why}`)
  if (buffer.byteLength < HEADER_BYTES) throw refuse(`${String(buffer.byteLength)} bytes`)
  const view = new DataView(buffer)
  if (MAGIC.some((byte, i) => view.getUint8(i) !== byte)) throw refuse('not opened by EHAB')
  if (view.getUint8(4) !== BAKED_BANDS_VERSION)
    throw refuse(`version ${String(view.getUint8(4))}, ${String(BAKED_BANDS_VERSION)} expected`)
  if (view.getUint8(5) !== BAND_STEPS_PER_KM)
    throw refuse(`${String(view.getUint8(5))} steps a km, ${String(BAND_STEPS_PER_KM)} expected`)
  const regions = view.getUint32(16, true)
  const total = view.getUint32(20, true)
  const start = HEADER_BYTES + POLITY_BYTES * regions
  if (buffer.byteLength !== start + 2 * total)
    throw refuse(
      `${String(buffer.byteLength)} bytes for ${String(regions)} polities and ${String(total)} vertices`
    )
  const polities = Array.from({ length: regions }, (_, index) => ({
    count: view.getUint32(HEADER_BYTES + POLITY_BYTES * index, true),
    print: view.getUint32(HEADER_BYTES + POLITY_BYTES * index + 4, true),
  }))
  if (polities.reduce((sum, { count }) => sum + count, 0) !== total)
    throw refuse(`the polities' counts do not add up to ${String(total)} vertices`)
  return {
    grid: { segX: view.getUint32(8, true), segY: view.getUint32(12, true) },
    polities,
    own: new Int8Array(buffer, start, total),
    realm: new Int8Array(buffer, start + total, total),
  }
}

/**
 * Lay a year's baked distances on its fills, each banded polity whose cut matches the build's — its count of vertices
 * and their print.
 * @param fills - the fills, cut on `grid`, in the regions' order
 * @param regions - the regions, saying which wear a band (`FillRegion`, read for its flag alone)
 * @param grid - the grid the fills were cut on
 * @param baked - the year's distances
 * @returns the fills, a matching banded one with its `bandKm` and `realmKm`, and the banded polities that did not match
 * @throws when the file was written for another grid or another count of polities — not a rounding but another map, a
 *   defect said before a distance is laid anywhere
 */
export function applyBakedBands(
  fills: readonly IndexedFill[],
  regions: readonly { readonly banded?: boolean }[],
  grid: FillGrid,
  baked: BakedBands
): LaidBands {
  if (baked.grid.segX !== grid.segX || baked.grid.segY !== grid.segY)
    throw new Error(
      `baked bands: written for a grid of ${String(baked.grid.segX)}×${String(baked.grid.segY)}, cut on ${String(grid.segX)}×${String(grid.segY)}`
    )
  if (baked.polities.length !== fills.length)
    throw new Error(
      `baked bands: written for ${String(baked.polities.length)} polities, ${String(fills.length)} cut`
    )
  const unmatched: number[] = []
  let start = 0
  const laid = fills.map((fill, index) => {
    // Every entry exists: the counts were checked equal above.
    const entry = baked.polities[index] ?? { count: 0, print: 0 }
    const from = start
    start += entry.count
    if (regions[index]?.banded !== true) return fill
    const count = Math.floor(fill.vertices.length / 2)
    if (entry.count !== count || entry.print !== vertexPrint(fill)) {
      unmatched.push(index)
      return fill
    }
    const bandKm = new Float32Array(count)
    const realmKm = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      // `from + i` stays within the polity's own run, its count checked against the file's total on reading.
      bandKm[i] = (baked.own[from + i] ?? Number.NaN) / BAND_STEPS_PER_KM
      realmKm[i] = (baked.realm[from + i] ?? Number.NaN) / BAND_STEPS_PER_KM
    }
    return { ...fill, bandKm, realmKm }
  })
  return { fills: laid, unmatched }
}
