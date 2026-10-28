/**
 * Whether a name fits along a line in its space, and the largest size it fits at (ATLAS-301,
 * `files/plans/atlas/country-names.md`, « the size »): the fitting half of `namePlacement`, which chooses
 * between the lines this measures.
 *
 * A name fits when the box its letters fill along the line keeps the margin from the space's edge, read off
 * the space's distances (`geo/distanceTransform`); its largest size is found by halving. Two lines of a name
 * are fitted as one block, as tall as both.
 */

import { distanceToOutside } from '../geo/distanceTransform'
import { readAt } from '../utils/math'

import { horizontalLine, innermostCell, ridgeLine } from './nameLine'

import type { NameLine } from './nameLine'
import type { NameSpace } from './nameSpace'

/**
 * The thicknesses of the space the ridge is walked through, as fractions of its thickest point: a thin
 * threshold lets the line run long, a thick one keeps it where the letters can be tall. Each gives a
 * candidate and the largest name wins.
 */
const RIDGE_THRESHOLDS = [0.25, 0.5, 0.75] as const

/** How many halvings the search for the size makes — far past a cell's precision. */
const SIZE_HALVINGS = 40

/**
 * A distance read between the cells' centres, linearly in both directions.
 * @param distances - each cell's distance to the outside, row-major
 * @param width - the crop's width
 * @param height - the crop's height
 * @param x - the column
 * @param y - the row
 * @returns the distance there
 */
function distanceAt(
  distances: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  const cx = Math.min(width - 1, Math.max(0, x))
  const cy = Math.min(height - 1, Math.max(0, y))
  const x0 = Math.min(width - 2, Math.floor(cx))
  const y0 = Math.min(height - 2, Math.floor(cy))
  const fx = cx - x0
  const fy = cy - y0
  const at = (col: number, row: number): number => readAt(distances, row * width + col)
  return (
    at(x0, y0) * (1 - fx) * (1 - fy) +
    at(x0 + 1, y0) * fx * (1 - fy) +
    at(x0, y0 + 1) * (1 - fx) * fy +
    at(x0 + 1, y0 + 1) * fx * fy
  )
}

/** A place on a line: a point, and the line's direction there. */
export interface LinePlace {
  /** The column, in the crop's cells. */
  readonly x: number
  /** The row, `y` downward. */
  readonly y: number
  /** The line's direction, radians from `+x` towards `+y`. */
  readonly angle: number
}

/**
 * The point a length along a line reaches, and the line's direction there.
 * @param line - the line
 * @param length - the length walked, in cells
 * @returns the point and the direction of the segment it lies on
 */
export function pointAlong(line: NameLine, length: number): LinePlace {
  const { points, lengths } = line
  let i = 0
  while (i < lengths.length - 2 && readAt(lengths, i + 1) < length) i += 1
  const a = points[i]
  const b = points[i + 1]
  // `sampled` gives every line two points at least and one length per point: a miss is a line built wrong.
  if (a === undefined || b === undefined)
    throw new Error(
      `[atlas] a name line of ${String(points.length)} points has none at ${String(i)}`
    )
  const span = readAt(lengths, i + 1) - readAt(lengths, i)
  const f = span > 0 ? Math.min(1, Math.max(0, (length - readAt(lengths, i)) / span)) : 0
  return {
    x: a[0] + (b[0] - a[0]) * f,
    y: a[1] + (b[1] - a[1]) * f,
    angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
  }
}

/** A space prepared for fitting: its crop and its distances. */
export interface Fitting {
  /** The space, cropped from the grid. */
  readonly space: NameSpace
  /** Each of its cells' distance to the outside. */
  readonly distances: Float32Array
}

/**
 * A space prepared for fitting.
 * @param space - the space
 * @returns it, with its distances
 */
export function fittingOf(space: NameSpace): Fitting {
  return { space, distances: distanceToOutside(space.mask, space.width, space.height) }
}

/**
 * How far apart the points read across a letter's height are, in cells. The same spacing as along the line
 * (`nameLine`'s step), chosen on its own: the two samplings answer different questions and may part.
 */
const CROSS_STEP = 0.5

/** How far a cell's centre lies inside its own edge, in cells: a distance between centres less this is a distance to the edge. */
const HALF_CELL = 0.5

/**
 * Whether the cross-section of the letters at one place on the line keeps clear of the space's edge: every
 * point from the letters' foot to their top, across the line, at least `margin` from it.
 * @param fitting - the space and its distances
 * @param place - the point on the line, and the line's direction there
 * @param half - half the letters' height at the size tried, in cells
 * @param margin - the room to keep, in cells
 * @returns whether it keeps clear
 */
function crossClear(fitting: Fitting, place: LinePlace, half: number, margin: number): boolean {
  const { distances, space } = fitting
  // The letters' up: the line's direction turned a quarter towards the top of the page.
  const ux = Math.sin(place.angle)
  const uy = -Math.cos(place.angle)
  const count = Math.max(1, Math.ceil((2 * half) / CROSS_STEP))
  for (let i = 0; i <= count; i += 1) {
    const t = -half + (2 * half * i) / count
    const x = place.x + t * ux
    const y = place.y + t * uy
    if (distanceAt(distances, space.width, space.height, x, y) - HALF_CELL < margin) return false
  }
  return true
}

/**
 * Whether a name of a size fits along a line, centred on it.
 *
 * It fits when the box the letters fill along the line keeps `margin` from the space's edge: across the line
 * at both ends of the name and at every point of the line in between, from the letters' foot to their top.
 * A point's distance to the **edge** is its distance to the nearest outside cell's centre less half a cell.
 * @param fitting - the space and its distances
 * @param line - the line
 * @param metrics - the name's length and its letters' height, at a size of one
 * @param size - the size tried
 * @param margin - the room to keep, in cells
 * @returns whether it fits
 */
function fits(
  fitting: Fitting,
  line: NameLine,
  metrics: NameExtent,
  size: number,
  margin: number
): boolean {
  const total = lineLength(line)
  const length = metrics.length * size
  if (length > total) return false
  const start = (total - length) / 2
  const end = start + length
  const half = (metrics.height * size) / 2
  const places = [start, ...line.lengths.filter((walked) => walked > start && walked < end), end]
  return places.every((walked) => crossClear(fitting, pointAlong(line, walked), half, margin))
}

/**
 * A line's length.
 * @param line - the line
 * @returns the length walked to its last point, in cells
 */
export function lineLength(line: NameLine): number {
  return readAt(line.lengths, line.lengths.length - 1)
}

/** A name's measure as the fit reads it: its length and its letters' height, at a size of one. */
export interface NameExtent {
  /** The sum of its advances. */
  readonly length: number
  /** Its letters' height. */
  readonly height: number
}

/**
 * The largest size a name fits at along a line.
 *
 * Searched by halving between nothing and a size that cannot fit — longer than the line, or taller than the
 * crop — since a name that fits at a size fits at every smaller one.
 * @param fitting - the space and its distances
 * @param line - the line
 * @param extent - the name's length and height at a size of one
 * @param margin - the room to keep, in cells
 * @returns the size, `0` when nothing fits
 */
function largestSize(fitting: Fitting, line: NameLine, extent: NameExtent, margin: number): number {
  const { width, height } = fitting.space
  let high = Math.min(lineLength(line) / extent.length, Math.max(width, height) / extent.height)
  if (fits(fitting, line, extent, high, margin)) return high
  let low = 0
  for (let i = 0; i < SIZE_HALVINGS; i += 1) {
    const middle = (low + high) / 2
    if (fits(fitting, line, extent, middle, margin)) low = middle
    else high = middle
  }
  return low
}

/** A line a name can be written along in a space, and the largest size it fits at there. */
export interface LineFit {
  /** The line. */
  readonly line: NameLine
  /** The size, in cells; `0` when nothing fits. */
  readonly size: number
}

/**
 * A name written straight across its space, through the space's most inner cell.
 * @param fitting - the space and its distances
 * @param extent - the name's length and height at a size of one
 * @param margin - the room to keep, in cells
 * @returns the horizontal and the size the name fits at along it
 */
export function horizontalFit(fitting: Fitting, extent: NameExtent, margin: number): LineFit {
  const line = horizontalLine(fitting.space.mask, fitting.distances, fitting.space.width)
  return { line, size: largestSize(fitting, line, extent, margin) }
}

/**
 * A name written along its space's shape: the ridge, walked at several thicknesses, the one that lets the name
 * be largest kept.
 * @param fitting - the space and its distances
 * @param extent - the name's length and height at a size of one
 * @param margin - the room to keep, in cells
 * @returns the ridge and the size the name fits at along it, or `null` when the space gives no ridge
 */
export function ridgeFit(fitting: Fitting, extent: NameExtent, margin: number): LineFit | null {
  const { space, distances } = fitting
  const thickest = readAt(distances, innermostCell(distances))
  let best: LineFit | null = null
  for (const fraction of RIDGE_THRESHOLDS) {
    const line = ridgeLine(distances, space.width, space.height, Math.max(1, thickest * fraction))
    if (line === null) continue
    const size = largestSize(fitting, line, extent, margin)
    if (best === null || size > best.size) best = { line, size }
  }
  return best
}
