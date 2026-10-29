/**
 * Whether a name fits along a line in its space, and the largest size it fits at (ATLAS-301,
 * `files/plans/atlas/country-names.md`, « the size »): the fitting half of `namePlacement`, which chooses
 * between the lines this measures.
 *
 * A name fits when the box its letters fill along the line keeps the margin from the space's edge, read off
 * the space's signed distances to its edge (`geo/distanceTransform`, inside and out) — a margin below zero lets the
 * letters spill over the border by that much; its largest size is found by halving. Two lines of a name
 * are fitted as one block, as tall as both.
 */

import { distanceToOutside } from '../geo/distanceTransform'
import { readAt } from '../utils/math'

import { horizontalLine, innermostCell, ridgeLine } from './nameLine'
import { COVERED } from './nameOccupancy'

import type { NameLine } from './nameLine'
import type { NameSpace } from './nameSpace'

/**
 * The thicknesses of the space the ridge is walked through, as fractions of its thickest point: a thin
 * threshold lets the line run long, a thick one keeps it where the letters can be tall. Each gives a
 * candidate and the largest name wins.
 */
const RIDGE_THRESHOLDS = [0.25, 0.5, 0.75] as const

/**
 * How many halvings the search for the size makes: the size known to 1/65 536 of its first bound, far past what
 * a letter drawn on screen can show (40 cost three times the time for nothing, measured 2026-10-28).
 */
const SIZE_HALVINGS = 16

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
  /** Each of its cells' distance to the outside — what the lines are drawn from. */
  readonly distances: Float32Array
  /**
   * Each cell's distance to the space's **edge**, signed: positive inside, negative outside — what the letters are
   * fitted by, so a margin below zero lets them spill over the border by that much. Read between two cells'
   * centres, the edge lies half a cell from each.
   */
  readonly edge: Float32Array
  /**
   * Each cell's distance to the edge of the nearest neighbour's cell, or past the map's frame, plus how far a name may
   * bite into them: what holds a name spilling over its border to the sea, and nearly off its neighbours.
   */
  readonly bound: Float32Array
  /** Each cell's distance to the edge of the nearest cell another piece's name covers, which no letter enters. */
  readonly covered: Float32Array
}

/** How far a cell's centre lies from its own edge, in cells: a distance between centres less this is a distance to the edge. */
const HALF_CELL = 0.5

/**
 * A space prepared for fitting.
 * @param space - the space
 * @param bite - how far a name may reach into a neighbour's cells, in cells — `0`, up to them
 * @returns it, with its distances inside, its signed distances to the edge, and to what bounds it
 */
export function fittingOf(space: NameSpace, bite = 0): Fitting {
  const { mask, width, height } = space
  const distances = distanceToOutside(mask, width, height)
  const outside = mask.map((inside) => (inside === 0 ? 1 : 0))
  const away = distanceToOutside(outside, width, height)
  const edge = new Float32Array(mask.length)
  for (let i = 0; i < mask.length; i += 1)
    edge[i] = mask[i] === 0 ? HALF_CELL - readAt(away, i) : readAt(distances, i) - HALF_CELL
  return {
    space,
    distances,
    edge,
    bound: boundOf(space, NEIGHBOUR).map((distance) => distance + bite),
    covered: boundOf(space, COVERED),
  }
}

/** What a neighbour's cell, or one past the frame, reads as in a space's `blocked`. */
const NEIGHBOUR = 1

/**
 * Each cell's distance to the edge of the nearest cell of a kind.
 *
 * A crop with no such cell — an island alone in the sea — is bounded by nothing: every cell is given a distance
 * farther than any in the crop. A finite one, since the fit reads it between cells, where `Infinity` times nought
 * would be `NaN`.
 * @param space - the space and its blocked cells
 * @param kind - the kind: a neighbour's, or another name's
 * @returns the distances, row-major
 */
function boundOf(space: NameSpace, kind: number): Float32Array {
  const { blocked, width, height } = space
  if (!blocked.includes(kind)) return new Float32Array(blocked.length).fill(width + height)
  const open = blocked.map((cell) => (cell === kind ? 0 : 1))
  return distanceToOutside(open, width, height).map((distance) => distance - HALF_CELL)
}

/**
 * How far apart the points read across a letter's height are, in cells. The same spacing as along the line
 * (`nameLine`'s step), chosen on its own: the two samplings answer different questions and may part.
 */
const CROSS_STEP = 0.5

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
  // The letters' up: the line's direction turned a quarter towards the top of the page.
  const ux = Math.sin(place.angle)
  const uy = -Math.cos(place.angle)
  const count = Math.max(1, Math.ceil((2 * half) / CROSS_STEP))
  for (let i = 0; i <= count; i += 1) {
    const t = -half + (2 * half * i) / count
    if (slackAt(fitting, place.x + t * ux, place.y + t * uy, margin) < 0) return false
  }
  return true
}

/**
 * How finely the room across a line is walked out from each of its points, in cells: a quarter of the cross
 * step, so the room read stays within a quarter of a cell of the edge.
 */
const ROOM_STEP = CROSS_STEP / 4

/**
 * How much room a point has past the margin, and short of any neighbour.
 * @param fitting - the space and its distances
 * @param x - the column
 * @param y - the row
 * @param margin - the room to keep, in cells; below zero, how far over the border it may spill
 * @returns the lesser of its distance to the edge less the margin and its distance to a neighbour: negative when the
 *   point is too close, or over a neighbour
 */
function slackAt(fitting: Fitting, x: number, y: number, margin: number): number {
  const { edge, bound, covered, space } = fitting
  return Math.min(
    distanceAt(edge, space.width, space.height, x, y) - margin,
    distanceAt(bound, space.width, space.height, x, y),
    distanceAt(covered, space.width, space.height, x, y)
  )
}

/**
 * How far one can walk from a point that keeps clear, in one direction, before a point no longer does.
 *
 * The walk leaps where the room allows: the signed distances are exact Euclidean ones either side of the edge,
 * and step by one cell across it, so they change no faster than the walk, and read between the cells' centres no faster than √2 times it — every point within a point's
 * slack over √2 keeps clear too. Only near the edge does it step by `ROOM_STEP`.
 * @param fitting - the space and its distances
 * @param from - the point, which keeps clear
 * @param toward - the direction, a unit vector
 * @param margin - the room to keep, in cells
 * @param reach - the furthest worth walking
 * @returns the length walked while keeping clear, `reach` at most
 */
function roomOneWay(
  fitting: Fitting,
  from: readonly [number, number],
  toward: readonly [number, number],
  margin: number,
  reach: number
): number {
  const slackAlong = (t: number): number =>
    slackAt(fitting, from[0] + t * toward[0], from[1] + t * toward[1], margin)
  let t = 0
  let slack = slackAlong(0)
  while (t < reach) {
    const leap = slack / Math.SQRT2
    if (leap >= ROOM_STEP) {
      t = Math.min(reach, t + leap)
      slack = slackAlong(t)
      continue
    }
    const ahead = slackAlong(t + ROOM_STEP)
    if (ahead < 0) return t
    t += ROOM_STEP
    slack = ahead
  }
  return reach
}

/**
 * The room across a line at each of its points: the largest half-height of letters centred on the line that keeps
 * `margin` from the edge there, walked out both ways. Measured **once per line**, so each size the search tries
 * reads a number per point instead of the distances again — the search spent nearly all its time there
 * (measured 2026-10-28, ~10 s a level of 1100).
 *
 * A point's direction is the one `pointAlong` gives at its length: the segment that reaches it, the first
 * segment for the first point.
 * @param fitting - the space and its distances
 * @param line - the line
 * @param margin - the room to keep, in cells
 * @param reach - the largest half-height the search will try: the walk stops there
 * @returns one room per point of the line, in cells; `-1` where the point itself is too close to the edge
 */
function roomAcross(fitting: Fitting, line: NameLine, margin: number, reach: number): Float32Array {
  const { points } = line
  const room = new Float32Array(points.length)
  for (let i = 0; i < points.length; i += 1) {
    const at = points[i]
    const a = points[Math.max(0, i - 1)]
    const b = points[Math.max(1, i)]
    if (at === undefined || a === undefined || b === undefined)
      throw new Error(
        `[atlas] a name line of ${String(points.length)} points has none at ${String(i)}`
      )
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0])
    // The letters' up, as in `crossClear`.
    const ux = Math.sin(angle)
    const uy = -Math.cos(angle)
    room[i] =
      slackAt(fitting, at[0], at[1], margin) < 0
        ? -1
        : Math.min(
            roomOneWay(fitting, at, [ux, uy], margin, reach),
            roomOneWay(fitting, at, [-ux, -uy], margin, reach)
          )
  }
  return room
}

/**
 * Whether a name of a size fits along a line, centred on it.
 *
 * It fits when the box the letters fill along the line keeps `margin` from the space's edge: across the line
 * at both ends of the name and at every point of the line in between, from the letters' foot to their top.
 * A point's distance to the **edge** is its distance to the nearest outside cell's centre less half a cell.
 * The points in between read their room, measured once (`roomAcross`); the two ends, which fall between
 * points, are sampled.
 * @param fitting - the space and its distances
 * @param line - the line
 * @param room - the room across the line at each of its points
 * @param metrics - the name's length and its letters' height, at a size of one
 * @param size - the size tried
 * @param margin - the room to keep, in cells
 * @returns whether it fits
 */
function fits(
  fitting: Fitting,
  line: NameLine,
  room: Float32Array,
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
  for (let i = 0; i < room.length; i += 1) {
    const walked = readAt(line.lengths, i)
    if (walked > start && walked < end && readAt(room, i) < half) return false
  }
  return (
    crossClear(fitting, pointAlong(line, start), half, margin) &&
    crossClear(fitting, pointAlong(line, end), half, margin)
  )
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
export function largestSize(
  fitting: Fitting,
  line: NameLine,
  extent: NameExtent,
  margin: number
): number {
  const { width, height } = fitting.space
  let high = Math.min(lineLength(line) / extent.length, Math.max(width, height) / extent.height)
  const room = roomAcross(fitting, line, margin, (extent.height * high) / 2)
  if (fits(fitting, line, room, extent, high, margin)) return high
  let low = 0
  for (let i = 0; i < SIZE_HALVINGS; i += 1) {
    const middle = (low + high) / 2
    if (fits(fitting, line, room, extent, middle, margin)) low = middle
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
