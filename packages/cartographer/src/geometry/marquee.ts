import type { Point } from '../view/viewport'

/**
 * The marquee — the rubber-band rectangle, and the anchors it catches.
 *
 * **It is the only way to select more than one anchor**, by decision (2026-09-22): there is no V tool and
 * no transform box, because *"nous ne voulons juste que dessiner"*. Moving a whole outline stays reachable
 * — marquee all of its anchors — but as a consequence rather than a feature.
 *
 * `s00` also fixes what it leaves behind: **no frame on release**. That is the painter's business; this
 * module only answers which anchors were inside.
 */

/** A rectangle in screen pixels, with width and height never negative. */
export interface Rect {
  /** Left edge. */
  x: number
  /** Top edge. */
  y: number
  /** Width, zero or more. */
  width: number
  /** Height, zero or more. */
  height: number
}

/**
 * The rectangle between two corners, whichever way round they were dragged.
 *
 * **Normalising is the whole point, and the plausible version skips it**: `{ x: from[0], y: from[1],
 * width: to[0] - from[0], height: to[1] - from[1] }` is right for a drag down-and-right and gives
 * negative extents for the other three directions — so dragging up-and-left selects nothing at all, in
 * silence, and the tool looks broken only for left-handed gestures.
 * @param from - where the drag started, in screen pixels
 * @param to - where the pointer is now, in screen pixels
 * @returns the rectangle they span
 */
export function normaliseRect(from: Point, to: Point): Rect {
  return {
    x: Math.min(from[0], to[0]),
    y: Math.min(from[1], to[1]),
    width: Math.abs(to[0] - from[0]),
    height: Math.abs(to[1] - from[1]),
  }
}

/**
 * Whether a point is inside a rectangle, edges included.
 * @param rect - the rectangle, already normalised
 * @param point - the point, in screen pixels
 * @returns `true` when the point is inside or on the edge
 */
export function rectContains(rect: Rect, point: Point): boolean {
  return (
    point[0] >= rect.x &&
    point[0] <= rect.x + rect.width &&
    point[1] >= rect.y &&
    point[1] <= rect.y + rect.height
  )
}

/**
 * The anchors a marquee catches.
 *
 * Edges are **inclusive**: the reader dragged the band through the point, so excluding it would make the
 * gesture miss what it visibly covered. Returned in array order, which is anchor order — the caller may
 * need to know which, never how they were found.
 * @param points - the candidates, in screen pixels, parallel to the document's anchors
 * @param rect - the marquee, already normalised
 * @returns the indices inside it, ascending
 */
export function pointsInRect(points: readonly Point[], rect: Rect): number[] {
  const caught: number[] = []
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    if (point !== undefined && rectContains(rect, point)) caught.push(index)
  }
  return caught
}
