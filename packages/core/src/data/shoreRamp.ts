/**
 * Bring the relief down to sea level at the land mask's shoreline.
 *
 * The elevation grid and the land mask come from two sources, and they disagree about where the coast
 * is: measured on 2026-10-16, the DEM still reads 63 m at the median point of the mask's coastline, over
 * 330 m at one coast in ten and over 900 m at one in a hundred. The sea is flat at zero, so every coast
 * was drawn as a cliff — its flank carrying the land's colour down into the sea, the shoreline line
 * (laid just above the water) hidden inside it, and small islands standing up as blocks.
 *
 * The mask decides where the land ends; this decides that the land ends at the water. Inside a ramp of
 * the given width, elevation is scaled down smoothly to zero at the shore; beyond it the grid is untouched.
 */

import { verticalToLatitude } from '../geo/mercator'

import { createHeightmap } from './heightmap'

import type { Heightmap } from './heightmap'
import type { LandMask } from './landMask'

/** Kilometres per degree of longitude at the equator (WGS84 equatorial radius). */
const KM_PER_DEGREE = 111.32

/** Below this land fraction a grid cell is sea: half its footprint or more is water. */
const SEA_BELOW = 0.5

/** Chamfer step to a diagonal neighbour, in cells — close enough to √2 for a ramp a few cells wide. */
const DIAGONAL = Math.SQRT2

/**
 * The land fraction of one grid cell, its footprint sampled `k × k` times.
 * @param mask - which parts of the map are land
 * @param x - the cell's column
 * @param y - the cell's row
 * @param span - the grid's last column and row index, never below one
 * @param span.x - last column index
 * @param span.y - last row index
 * @param k - samples per axis
 * @returns the fraction in `[0, 1]`
 */
function cellLandFraction(
  mask: LandMask,
  x: number,
  y: number,
  span: { x: number; y: number },
  k: number
): number {
  let land = 0
  for (let j = 0; j < k; j++) {
    const v = (y - 0.5 + (j + 0.5) / k) / span.y
    for (let i = 0; i < k; i++) if (mask.isLand((x - 0.5 + (i + 0.5) / k) / span.x, v)) land++
  }
  return land / (k * k)
}

/**
 * The land fraction of every grid cell, read off a mask that may be finer than the grid.
 *
 * A cell's footprint is sampled `k × k` times, `k` being how many mask cells fit in one grid cell, so a
 * 4× mask is read in full and a mask at the grid's own resolution once per cell.
 * @param grid - the grid's dimensions
 * @param grid.width - width in cells
 * @param grid.height - height in cells
 * @param mask - which parts of the map are land
 * @returns one fraction in `[0, 1]` per grid cell, row-major
 */
export function landFractions(
  grid: { width: number; height: number },
  mask: LandMask
): Float32Array {
  const { width, height } = grid
  const k = Math.max(1, Math.round(mask.meta.width / width))
  const span = { x: Math.max(1, width - 1), y: Math.max(1, height - 1) }
  const out = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) out[y * width + x] = cellLandFraction(mask, x, y, span, k)
  }
  return out
}

/** A neighbour a chamfer pass reads: its offset, and the step to it in cells. */
interface ChamferTap {
  /** Column offset. */
  dx: number
  /** Row offset. */
  dy: number
  /** Step length, in cells. */
  step: number
}

/** The neighbours already visited by a pass running west→east, north→south. */
const FORWARD_TAPS: readonly ChamferTap[] = [
  { dx: -1, dy: 0, step: 1 },
  { dx: 0, dy: -1, step: 1 },
  { dx: -1, dy: -1, step: DIAGONAL },
  { dx: 1, dy: -1, step: DIAGONAL },
]

/** The same neighbours, mirrored for the pass running east→west, south→north. */
const BACKWARD_TAPS: readonly ChamferTap[] = FORWARD_TAPS.map(({ dx, dy, step }) => ({
  dx: -dx,
  dy: -dy,
  step,
}))

/**
 * Relax one cell against the neighbours a pass has already settled.
 * @param d - the distances, updated in place
 * @param width - the grid width
 * @param height - the grid height
 * @param x - the cell's column
 * @param y - the cell's row
 * @param taps - the neighbours to read
 * @returns nothing; `d` is written in place
 */
function relaxCell(
  d: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  taps: readonly ChamferTap[]
): void {
  const i = y * width + x
  for (const { dx, dy, step } of taps) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
    const through = (d[ny * width + nx] ?? Infinity) + step
    if (through < (d[i] ?? Infinity)) d[i] = through
  }
}

/**
 * Distance from every land cell to the nearest sea cell, in cells, by a two-pass chamfer.
 *
 * Sea cells are zero. A grid with no sea at all leaves every cell at `Infinity`, which the ramp reads as
 * "far inland": nothing is lowered.
 * @param fractions - the land fraction of each cell
 * @param width - the grid width
 * @param height - the grid height
 * @returns the distances, row-major
 */
export function distanceToSea(
  fractions: Float32Array,
  width: number,
  height: number
): Float32Array {
  const d = new Float32Array(width * height)
  for (let i = 0; i < d.length; i++) d[i] = (fractions[i] ?? 0) < SEA_BELOW ? 0 : Infinity
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) relaxCell(d, width, height, x, y, FORWARD_TAPS)
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) relaxCell(d, width, height, x, y, BACKWARD_TAPS)
  }
  return d
}

/**
 * How much of its elevation a point keeps at a given distance from the shore.
 *
 * A smoothstep rather than a straight line, so the ramp meets the untouched relief with no crease.
 * @param distanceKm - distance to the shore
 * @param rampKm - the ramp's width
 * @returns a factor in `[0, 1]`
 */
export function shoreFactor(distanceKm: number, rampKm: number): number {
  if (rampKm <= 0) return 1
  const t = Math.min(1, Math.max(0, distanceKm / rampKm))
  return t * t * (3 - 2 * t)
}

/**
 * A copy of a heightmap whose relief comes down to sea level at the mask's shoreline.
 *
 * - **Sea, by the mask**: any elevation above zero is set to zero. The mesh draws sea flat at zero, so
 *   a cell the DEM calls land and the mask calls sea no longer stands up out of the water.
 * - **Land within `rampKm` of the sea**: elevation is scaled down smoothly to zero at the shore.
 * - **Everything else**, and anything at or below zero (a polder, bathymetry), is left as it was.
 *
 * Distances are in kilometres at each row's own latitude: the grid is Web Mercator, conformal, so a cell
 * is as tall as it is wide there and shrinks toward the pole. A land cell next to the sea is counted half
 * a cell from the shore, which runs between the two.
 * @param source - the elevation grid
 * @param mask - which parts of the map are land
 * @param rampKm - the ramp's width; zero or less returns the source itself
 * @returns the lowered grid, same metadata
 */
export function taperHeightmapToShore(
  source: Heightmap,
  mask: LandMask,
  rampKm: number
): Heightmap {
  if (rampKm <= 0) return source
  const { width, height, bbox } = source.meta
  const fractions = landFractions(source.meta, mask)
  const distances = distanceToSea(fractions, width, height)
  const degreesPerCell = (bbox.east - bbox.west) / Math.max(1, width - 1)
  const out = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    const latitude = verticalToLatitude(height > 1 ? y / (height - 1) : 0, bbox)
    const kmPerCell = degreesPerCell * KM_PER_DEGREE * Math.cos((latitude * Math.PI) / 180)
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const elevation = source.data[i] ?? 0
      const cells = distances[i] ?? Infinity
      out[i] =
        elevation <= 0
          ? elevation
          : elevation * shoreFactor(Math.max(0, cells - 0.5) * kmPerCell, rampKm)
    }
  }
  return createHeightmap(source.meta, out)
}
