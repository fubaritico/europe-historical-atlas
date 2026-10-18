import { squaredRadius } from './hitTest'

import type { Point } from '../viewport/viewport'

/**
 * Which stretch of the target's outline is under the pointer — where the idle Pen inserts a point
 * (`s03`: *"When I click on a stretch between two anchors / Then a new anchor is created at that point"*).
 *
 * Screen pixels, on the anchors already projected, for `hitTest`'s reasons; the radius is passed in.
 */

/** A stretch under the pointer: its two anchors, and the point on it nearest the pointer. */
export interface StretchHit {
  /** One end, an anchor index. */
  a: number
  /** The other end. */
  b: number
  /** The point of the stretch nearest the pointer, in screen pixels — where the new anchor goes. */
  at: Point
}

/**
 * The point of a segment nearest a position, and its squared distance.
 * @param p - the position
 * @param a - one end
 * @param b - the other
 * @returns the nearest point and how far it is, squared
 */
function nearestOnSegment(p: Point, a: Point, b: Point): { at: Point; distance: number } {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const length = dx * dx + dy * dy
  const t =
    length === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length))
  const at: Point = [a[0] + t * dx, a[1] + t * dy]
  return { at, distance: (p[0] - at[0]) ** 2 + (p[1] - at[1]) ** 2 }
}

/**
 * The stretch nearest the pointer within a radius, among the given pairs of anchors.
 * @param points - every anchor, in screen pixels, parallel to the document's table
 * @param stretches - the pairs of anchors that are stretches of the outline
 * @param at - the pointer, in screen pixels
 * @param radiusPx - how far it may be
 * @returns the nearest stretch in range, or `null`
 */
export function nearestStretch(
  points: readonly Point[],
  stretches: readonly (readonly [number, number])[],
  at: Point,
  radiusPx: number
): StretchHit | null {
  const limit = squaredRadius(radiusPx)
  let best: StretchHit | null = null
  let bestDistance = Infinity
  for (const [a, b] of stretches) {
    const pa = points[a]
    const pb = points[b]
    if (pa === undefined || pb === undefined) continue
    const near = nearestOnSegment(at, pa, pb)
    if (near.distance <= limit && near.distance < bestDistance) {
      best = { a, b, at: near.at }
      bestDistance = near.distance
    }
  }
  return best
}
