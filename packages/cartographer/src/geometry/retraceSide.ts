import { nearestOnSegment } from './stretchHit'

import type { Point } from '../view/viewport'

/**
 * Which way round a ring ⟨retrace⟩ replaces (`H-46`): between two anchors of a closed ring there are two
 * stretches, and the one replaced is **the one the new run lies closest to** — not the shorter. The
 * night of the general test drew Lori and Damascus along the wrong side because a follow took "the shorter
 * way" (defect 14); the author draws over the stretch that is wrong, so nearness is what names it.
 */

/** One of the two ways round: along the ring's stored order, or against it. */
export type RetraceSide = 'forward' | 'backward'

/**
 * The squared distance from a point to a polyline — to its nearest segment, or its only point.
 * @param point - the point
 * @param line - the polyline, at least one point
 * @returns the squared distance, `Infinity` for an empty line
 */
function distanceToLine(point: Point, line: readonly Point[]): number {
  const only = line[0]
  if (only === undefined) return Infinity
  if (line.length === 1) return (point[0] - only[0]) ** 2 + (point[1] - only[1]) ** 2
  let best = Infinity
  for (let at = 1; at < line.length; at += 1) {
    const a = line[at - 1]
    const b = line[at]
    if (a !== undefined && b !== undefined)
      best = Math.min(best, nearestOnSegment(point, a, b).distance)
  }
  return best
}

/**
 * How far apart two polylines lie: the mean distance of each one's points to the other — symmetric, so a
 * long stretch far from a short run scores as far as it looks.
 * @param a - one polyline
 * @param b - the other
 * @returns the mean distance, in the points' unit
 */
export function lineGap(a: readonly Point[], b: readonly Point[]): number {
  const count = a.length + b.length
  if (count === 0) return 0
  let sum = 0
  for (const point of a) sum += Math.sqrt(distanceToLine(point, b))
  for (const point of b) sum += Math.sqrt(distanceToLine(point, a))
  return sum / count
}

/**
 * The side the new run replaces: the stretch it lies closer to. On an exact tie, the stretch with fewer
 * points — the smaller change.
 * @param run - the new run, from the start anchor to the end anchor, in screen pixels
 * @param forward - the stretch along the ring's order, its two ends included
 * @param backward - the stretch against it, its two ends included
 * @returns the side to replace
 */
export function closerSide(
  run: readonly Point[],
  forward: readonly Point[],
  backward: readonly Point[]
): RetraceSide {
  const ahead = lineGap(run, forward)
  const behind = lineGap(run, backward)
  if (ahead !== behind) return ahead < behind ? 'forward' : 'backward'
  return forward.length <= backward.length ? 'forward' : 'backward'
}
