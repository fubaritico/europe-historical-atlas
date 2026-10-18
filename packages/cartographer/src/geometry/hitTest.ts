import type { Point } from '../viewport/viewport'

/**
 * Which anchor is under the pointer — the question every gesture asks first.
 *
 * **It works in screen pixels, on a flat array, and that is forced by two facts.**
 *
 *   1. **The tolerances are specified in screen pixels.** `s02`: *"every handle is about 8 screen pixels
 *      across, at any zoom"*, and for closing a ring, *"the tolerance is in screen pixels, not kilometres
 *      … the same constant as every other handle: `snapRadius / scale`"*. A module working in degrees
 *      would have to convert on every call, and nobody can aim finer than a pixel anyway.
 *   2. **Projecting per pointer move would not scale.** The document holds anchors in lon/lat, and `s01`
 *      announces *16 579 vertices* for 1100. Mercator's vertical axis is a `log(tan(…))`, so projecting
 *      the lot on every `pointermove` is sixteen thousand transcendental calls a frame. The projection
 *      happens **once per viewport change**, cached, and the cache belongs to the caller (step 4d).
 *
 * The array handed in is **parallel to `document.anchors`**, so the index returned *is* the anchor index —
 * nothing to map back, and no second identity to keep in step.
 *
 * **No tolerance is declared here.** Radii are passed in, same rule as `viewport/`'s zoom limits: a number
 * invented inside a pure function is a silent substitution, and this one is a product decision about how
 * forgiving the tool feels.
 */

/**
 * The squared distance between two screen points.
 *
 * Squared, and shared with {@link module:geometry/polylineSnap}, because a comparison against a radius
 * never needs the square root — and the root is the expensive half on a path with thousands of vertices.
 * @param a - one point
 * @param b - the other
 * @returns the squared distance, in square pixels
 */
export function distanceSquared(a: Point, b: Point): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

/**
 * A radius turned into the squared limit a distance is compared against.
 *
 * **A negative radius catches nothing, and that is a decision rather than arithmetic** (2026-10-05,
 * `rules/error-handling.md`). Squaring it would make `-8` behave exactly like `8` — a silent
 * substitution, and the dangerous shape: a caller that computed a negative radius (a `snapRadius / scale`
 * gone wrong) would get a plausible answer and never learn. Returning `-1` makes it catch nothing,
 * because no distance is negative, so the fault shows as a tool that has stopped responding.
 *
 * A non-finite radius lands in the same place. `Infinity` is left to mean what it says — the nearest
 * point anywhere — since that is coherent rather than plausible-but-wrong.
 *
 * Shared by all three modules that compare against a radius, so they cannot drift apart on it.
 * @param radiusPx - the radius in screen pixels
 * @returns the squared limit, or `-1` when the radius is not a distance
 */
export function squaredRadius(radiusPx: number): number {
  return radiusPx >= 0 ? radiusPx * radiusPx : -1
}

/**
 * The nearest point within a radius of a position.
 *
 * **Circular, not a box.** The plausible version tests `|dx| < r && |dy| < r`, which reads as the same
 * thing and is not: it reaches `r × √2` on the diagonal, so an anchor 11 pixels away is caught by an
 * 8-pixel tolerance. The handle the reader sees is round.
 *
 * **The nearest wins, not the first found.** Two anchors inside the radius is the ordinary case on a
 * dense outline, and returning whichever came first in the array would make the tool pick by storage
 * order — invisible, and impossible to aim around.
 *
 * The radius is **inclusive**: a point at exactly the radius is caught. One of the two has to be chosen,
 * and catching it matches the drawn handle, whose edge is at the radius.
 * @param points - the candidates, in screen pixels, parallel to the document's anchors
 * @param at - where the pointer is, in screen pixels
 * @param radiusPx - how far the pointer may be and still catch a point
 * @returns the index of the nearest point in range, or `null` when none is
 */
export function nearestPoint(points: readonly Point[], at: Point, radiusPx: number): number | null {
  const limit = squaredRadius(radiusPx)
  let best: number | null = null
  let bestDistance = Infinity
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    if (point === undefined) continue
    const distance = distanceSquared(point, at)
    if (distance <= limit && distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  }
  return best
}

/**
 * The nearest of some points within a radius — {@link nearestPoint}, restricted to a list of candidates.
 *
 * What the white arrow asks: the anchors it may pick up are the drawing target's, not every anchor of the
 * year, and the index returned is still the document's.
 * @param points - every point, in screen pixels, parallel to the document's anchors
 * @param candidates - the indices that may be caught
 * @param at - where the pointer is, in screen pixels
 * @param radiusPx - how far the pointer may be and still catch a point
 * @returns the index of the nearest candidate in range, or `null` when none is
 */
export function nearestAmong(
  points: readonly Point[],
  candidates: readonly number[],
  at: Point,
  radiusPx: number
): number | null {
  const limit = squaredRadius(radiusPx)
  let best: number | null = null
  let bestDistance = Infinity
  for (const index of candidates) {
    const point = points[index]
    if (point === undefined) continue
    const distance = distanceSquared(point, at)
    if (distance <= limit && distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  }
  return best
}
