import { distanceSquared, squaredRadius } from './hitTest'
import { isVertexOf, subPathBetween } from './polylineSnap'

import type { Point } from '../view/viewport'

/**
 * Snapping the Pen onto the coastline — `s02`'s *"two clicks, several hundred exact points"*.
 *
 * **Backdrop pixels, not screen pixels**, unlike `hitTest`: the coast is 95 233 points held in the
 * backdrop's grid, and turning all of them into screen positions on every pointer move to find one is
 * the work the culling exists to avoid. The pointer is brought into the coast's grid instead — one
 * point — and the radius with it (`radius / scale`).
 *
 * Declared structurally, so this layer reads no module above it: a contour is points, whether it
 * closes, and the box it fills.
 */

/** A contour of the traced coastline, in backdrop pixels. */
export interface CoastContour {
  /** Its points, in order. A closed contour does not repeat its first point at the end. */
  points: readonly Point[]
  /** Whether it closes on itself — an island, or a coast that loops. */
  closed: boolean
  /** The box it fills, so a contour far from the pointer is skipped on one comparison. */
  bounds: { left: number; top: number; right: number; bottom: number }
}

/** A vertex of the traced coastline: which contour, and which point of it. */
export interface CoastVertex {
  /** The contour's index in the coast layer. */
  contour: number
  /** The vertex's index in that contour. */
  vertex: number
}

/**
 * Whether a box comes within a radius of a point.
 * @param bounds - the box
 * @param at - the point
 * @param radius - the radius, same units
 * @returns `true` when some part of the box is within reach
 */
function withinReach(bounds: CoastContour['bounds'], at: Point, radius: number): boolean {
  return (
    at[0] >= bounds.left - radius &&
    at[0] <= bounds.right + radius &&
    at[1] >= bounds.top - radius &&
    at[1] <= bounds.bottom + radius
  )
}

/**
 * The coast vertex nearest the pointer, within a radius — or `null` when the coast is out of reach.
 *
 * **Every contour in reach is weighed against every other**, the trap `polylineSnap` names for rivers:
 * returning the first contour holding a vertex in range would let storage order pick between an
 * island and the shore beside it.
 * @param coast - the contours, in backdrop pixels
 * @param at - the pointer, in backdrop pixels
 * @param radius - how far it may be, in backdrop pixels
 * @returns the nearest vertex in reach, or `null`
 */
export function nearestCoastVertex(
  coast: readonly CoastContour[],
  at: Point,
  radius: number
): CoastVertex | null {
  const limit = squaredRadius(radius)
  let best: CoastVertex | null = null
  let bestDistance = Infinity
  coast.forEach((contour, index) => {
    if (!withinReach(contour.bounds, at, radius)) return
    contour.points.forEach((point, vertex) => {
      const distance = distanceSquared(point, at)
      if (distance <= limit && distance < bestDistance) {
        best = { contour: index, vertex }
        bestDistance = distance
      }
    })
  })
  return best
}

/**
 * The stretch of a contour between two of its vertices, both included, in walking order.
 *
 * **A closed contour can be walked two ways, and the shorter is taken** — the dev's call on the
 * approach, 2026-10-11. From the Somme to Brittany the long way round is the whole of Europe's coast;
 * the author following the shore with the eye means the short one. An open contour has one way, and
 * `subPathBetween` walks it whichever direction the clicks came in.
 * @param contour - the contour
 * @param from - the vertex the stretch starts at
 * @param to - the vertex it ends at
 * @returns the vertices from `from` to `to`, inclusive; empty when either is not a vertex of it
 */
export function coastStretch(contour: CoastContour, from: number, to: number): Point[] {
  const { points } = contour
  if (!contour.closed) return subPathBetween(points, from, to)
  if (!isVertexOf(points, from) || !isVertexOf(points, to)) return []
  return shortestRunBetween(points, from, to)
}

/**
 * The run of a closed loop between two of its positions, both included, the shorter way round —
 * forward when both ways are as long, so the answer does not flicker.
 *
 * Generic over what the loop holds: coast points, or the anchor indices of a ring, which is how the Pen
 * follows a neighbour's border along the very anchors it is made of.
 * @param loop - the loop, its last item joined to its first
 * @param from - the position the run starts at
 * @param to - the position it ends at
 * @returns the items from `from` to `to`, inclusive; empty when either is not a position of the loop
 */
export function shortestRunBetween<T>(loop: readonly T[], from: number, to: number): T[] {
  const count = loop.length
  if (!Number.isInteger(from) || !Number.isInteger(to)) return []
  if (from < 0 || to < 0 || from >= count || to >= count) return []
  const forward = (to - from + count) % count
  const backward = (from - to + count) % count
  const step = forward <= backward ? 1 : -1
  const run: T[] = []
  for (let walked = 0, at = from; walked <= Math.min(forward, backward); walked += 1) {
    const item = loop[at]
    if (item !== undefined) run.push(item)
    at = (at + step + count) % count
  }
  return run
}
