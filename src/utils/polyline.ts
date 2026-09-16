/**
 * Geometry on chains of points, expressed structurally so this stays a leaf: callers pass whatever
 * `{ u, v }` they already have — a grid coordinate, a border run — and nothing here needs to know which.
 */

/** A point on a chain, in whatever normalized space the caller is working in. */
export interface PlanarPoint {
  /** Horizontal coordinate. */
  u: number
  /** Vertical coordinate. */
  v: number
}

/**
 * Perpendicular distance from a point to the segment `a`–`b`.
 * @param point - the point
 * @param a - the segment's start
 * @param b - the segment's end
 * @returns the distance, in the same units as the inputs
 */
function pointSegmentDistance(point: PlanarPoint, a: PlanarPoint, b: PlanarPoint): number {
  const du = b.u - a.u
  const dv = b.v - a.v
  if (du === 0 && dv === 0) return Math.hypot(point.u - a.u, point.v - a.v)
  const t = Math.max(
    0,
    Math.min(1, ((point.u - a.u) * du + (point.v - a.v) * dv) / (du * du + dv * dv))
  )
  return Math.hypot(point.u - (a.u + t * du), point.v - (a.v + t * dv))
}

/**
 * Drop the points of a chain that say nothing — Douglas-Peucker.
 *
 * Keeps a vertex only when removing it would move the line further than `tolerance` from where it ran.
 * On a staircase this is transformative rather than cosmetic: every step of a diagonal run sits within
 * half a cell of the chord across it, so about one cell of tolerance collapses the staircase into the
 * straight line it was approximating. It also *reduces* the point count, where smoothing multiplies it.
 *
 * **It never moves the first or last point.** Border runs meet at tripoints, which are always an end of a
 * run, so simplifying each run independently cannot pull two of them apart and reopen a gap.
 *
 * What it *does* move is everything in between — off the boundary of the coloured area the line is meant
 * to bound. The fill keeps its own staircase, so the two only stay together while the tolerance is no
 * wider than the colour boundary is soft.
 * @param points - the chain
 * @param tolerance - how far the line may move, in the caller's units; 0 or less returns a copy
 * @returns the simplified chain
 */
export function simplifyPolyline<T extends PlanarPoint>(
  points: readonly T[],
  tolerance: number
): T[] {
  if (points.length < 3 || tolerance <= 0) return [...points]
  const keep = new Uint8Array(points.length)
  keep[0] = 1
  keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length > 0) {
    const span = stack.pop()
    if (!span) break
    const [first, last] = span
    const from = points[first]
    const to = points[last]
    if (!from || !to) continue
    let farthest = -1
    let furthest = tolerance
    for (let i = first + 1; i < last; i++) {
      const here = points[i]
      if (!here) continue
      const distance = pointSegmentDistance(here, from, to)
      if (distance > furthest) {
        furthest = distance
        farthest = i
      }
    }
    if (farthest === -1) continue
    keep[farthest] = 1
    stack.push([first, farthest], [farthest, last])
  }
  return points.filter((_, i) => keep[i] === 1)
}
