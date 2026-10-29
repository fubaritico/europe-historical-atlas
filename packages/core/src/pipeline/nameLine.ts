/**
 * The line a name is written along, inside its space (ATLAS-301, `files/plans/atlas/country-names.md`,
 * « the line »).
 *
 * What the lines are built from: the tools the arc along a space is drawn with (`nameArc`) — its reading frame, held to
 * a slant when the space is compact, a parabola fitted to its spine, bent {@link MAX_BEND} at most, and read upward past
 * {@link STEEPEST_DESCENT}. One line a space, never a comparison: the ridge walk and the candidates it fed were removed
 * on 2026-10-29 (« The gap to the reference »); compact spaces, written straight across that morning, take their arc
 * since the afternoon.
 *
 * **Coordinates are the space's crop**, a cell's centre at its integer column and row, `y` downward.
 */

import { readAt } from '../utils/math'

/** A line a name can be written along: points a fraction of a cell apart, and the length walked to each. */
export interface NameLine {
  /** The points, in order of reading, `[x, y]` in the crop's cells. */
  readonly points: readonly (readonly [number, number])[]
  /** The length walked from the first point to each, in cells; the last is the line's length. */
  readonly lengths: readonly number[]
}

/** How far apart the points of a line are, in cells: fine enough that the fit reads every cell it crosses. */
const STEP = 0.5

/**
 * The most a name's arc may turn from one end to the other, in radians — 60°. A name bent further reads as a
 * lettering exercise, not a name: *A program for automatic name placement*, in the Auto-Carto 6 proceedings,
 * set the same bound on curved names (read from its summary only).
 */
export const MAX_BEND = Math.PI / 3

/**
 * The steepest a name is read going down the page, in radians — 80°. Steeper, it is read from the bottom up,
 * as a name standing on a map's left side is: a line near the vertical has no "left to right", and reading
 * it downward would set the letters on their backs to anyone used to maps. Claude's choice, 2026-10-28, to
 * confirm on sight.
 */
export const STEEPEST_DESCENT = (80 * Math.PI) / 180

/**
 * Points along a curve, about {@link STEP} apart, from one value of its parameter to another, with the
 * length walked to each.
 * @param curve - a point for each value of the parameter
 * @param from - where the parameter starts
 * @param to - where it ends
 * @returns the line
 */
export function sampled(
  curve: (s: number) => readonly [number, number],
  from: number,
  to: number
): NameLine {
  const count = Math.max(2, Math.ceil((to - from) / STEP) + 1)
  const points: (readonly [number, number])[] = []
  const lengths: number[] = []
  let walked = 0
  for (let i = 0; i < count; i += 1) {
    const point = curve(from + ((to - from) * i) / (count - 1))
    const previous = points[i - 1]
    if (previous !== undefined) walked += Math.hypot(point[0] - previous[0], point[1] - previous[1])
    points.push(point)
    lengths.push(walked)
  }
  return { points, lengths }
}

/** Where a walk is read from: its mean, its reading direction and the letters' up. */
export interface ReadingFrame {
  /** The walk's mean point. */
  readonly origin: readonly [number, number]
  /** The reading direction, a unit vector pointing right — or upward, when the walk descends steeper than {@link STEEPEST_DESCENT}. */
  readonly along: readonly [number, number]
  /** The letters' up: the reading direction turned a quarter towards the top of the page. */
  readonly up: readonly [number, number]
}

/**
 * The frame a walk is read in: its main direction, by the spread of its points, read left to right.
 * @param path - the walk's points
 * @param steepest - the most the direction may slant from the horizontal, in radians: a steeper main axis is turned
 *   down to it, on its own side; a right angle leaves every direction as it is
 * @returns its frame
 */
export function readingFrame(
  path: readonly (readonly [number, number])[],
  steepest = Math.PI / 2
): ReadingFrame {
  let mx = 0
  let my = 0
  for (const [x, y] of path) {
    mx += x / path.length
    my += y / path.length
  }
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (const [x, y] of path) {
    sxx += (x - mx) * (x - mx)
    sxy += (x - mx) * (y - my)
    syy += (y - my) * (y - my)
  }
  // Half the angle of the spread's main axis, in (-π/2, π/2]: its cosine is never negative, so it reads right.
  const main = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  const axis = Math.min(steepest, Math.max(-steepest, main))
  // `y` runs down the page: a positive angle descends. Steeper than STEEPEST_DESCENT, it is read upward.
  const angle = axis > STEEPEST_DESCENT ? axis - Math.PI : axis
  const along: readonly [number, number] = [Math.cos(angle), Math.sin(angle)]
  return { origin: [mx, my], along, up: [along[1], -along[0]] }
}

/**
 * The determinant of a 3 × 3 matrix.
 * @param m - its nine entries, row by row
 * @returns the determinant
 */
function det(m: readonly number[]): number {
  return (
    readAt(m, 0) * (readAt(m, 4) * readAt(m, 8) - readAt(m, 5) * readAt(m, 7)) -
    readAt(m, 1) * (readAt(m, 3) * readAt(m, 8) - readAt(m, 5) * readAt(m, 6)) +
    readAt(m, 2) * (readAt(m, 3) * readAt(m, 7) - readAt(m, 4) * readAt(m, 6))
  )
}

/**
 * The parabola `t = a s² + b s + k` closest to points, by least squares.
 * @param points - the points, as `[s, t]`
 * @returns its three coefficients; a straight line through their mean where the points cannot tell a bend
 */
export function fitParabola(
  points: readonly (readonly [number, number])[]
): readonly [number, number, number] {
  let s0 = 0
  let s1 = 0
  let s2 = 0
  let s3 = 0
  let s4 = 0
  let t0 = 0
  let t1 = 0
  let t2 = 0
  for (const [s, t] of points) {
    s0 += 1
    s1 += s
    s2 += s * s
    s3 += s * s * s
    s4 += s * s * s * s
    t0 += t
    t1 += s * t
    t2 += s * s * t
  }
  const whole = det([s4, s3, s2, s3, s2, s1, s2, s1, s0])
  // Fewer than three distinct abscissas: no parabola is determined, and the points lie on a line.
  if (Math.abs(whole) < 1e-9) return [0, 0, t0 / s0]
  return [
    det([t2, s3, s2, t1, s2, s1, t0, s1, s0]) / whole,
    det([s4, t2, s2, s3, t1, s1, s2, t0, s0]) / whole,
    det([s4, s3, t2, s3, s2, t1, s2, s1, t0]) / whole,
  ]
}

/** How many halvings the search for the bend makes — far past what a letter's angle can show. */
const BEND_HALVINGS = 40

/**
 * A parabola's bend, straightened until it turns {@link MAX_BEND} at most between two abscissas.
 *
 * With the line's middle between its two ends (`from ≤ 0 ≤ to`), the turn grows with `|a|`: with
 * `u = 2a·to + b` and `v = 2a·from + b`, its derivative in `a`, `2·to / (1 + u²) − 2·from / (1 + v²)`, is never
 * negative whatever the slope `b` — so halving the gap converges on the largest `a` allowed.
 * @param a - the bend
 * @param b - the slope at the mean
 * @param from - the first abscissa
 * @param to - the last
 * @returns the bend, `a` itself when it turns little enough
 */
export function limitedBend(a: number, b: number, from: number, to: number): number {
  const turn = (bend: number): number =>
    Math.abs(Math.atan(2 * bend * to + b) - Math.atan(2 * bend * from + b))
  if (turn(a) <= MAX_BEND) return a
  let low = 0
  let high = 1
  for (let i = 0; i < BEND_HALVINGS; i += 1) {
    const middle = (low + high) / 2
    if (turn(a * middle) > MAX_BEND) high = middle
    else low = middle
  }
  return a * low
}
