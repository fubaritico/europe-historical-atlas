import { distanceSquared, squaredRadius } from './hitTest'
import { isVertexOf, subPathBetween } from './polylineSnap'

import type { Point } from '../view/viewport'

/**
 * Snapping the Pen onto a line of a snap layer — the coastline or a river, `s02`'s *"two clicks,
 * several hundred exact points"*. Named for the coast until the rivers joined it (2026-10-11).
 *
 * **Backdrop pixels, not screen pixels**, unlike `hitTest`: the coast is 95 233 points held in the
 * backdrop's grid, and turning all of them into screen positions on every pointer move to find one is
 * the work the culling exists to avoid. The pointer is brought into the lines' grid instead — one
 * point — and the radius with it (`radius / scale`).
 *
 * Declared structurally, so this layer reads no module above it: a contour is points, whether it
 * closes, and the box it fills.
 */

/** A line of a snap layer — a coast contour or a river — in backdrop pixels. */
export interface SnapLine {
  /** Its points, in order. A closed contour does not repeat its first point at the end. */
  points: readonly Point[]
  /** Whether it closes on itself — an island, a coast that loops. A river never does. */
  closed: boolean
  /** The box it fills, so a contour far from the pointer is skipped on one comparison. */
  bounds: { left: number; top: number; right: number; bottom: number }
}

/** A vertex of a snap layer: which line, and which point of it. */
export interface LineVertex {
  /** The line's index in its layer. */
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
function withinReach(bounds: SnapLine['bounds'], at: Point, radius: number): boolean {
  return (
    at[0] >= bounds.left - radius &&
    at[0] <= bounds.right + radius &&
    at[1] >= bounds.top - radius &&
    at[1] <= bounds.bottom + radius
  )
}

/**
 * The line vertex nearest the pointer, within a radius — or `null` when every line is out of reach.
 *
 * **Every contour in reach is weighed against every other**, the trap `polylineSnap` names for rivers:
 * returning the first contour holding a vertex in range would let storage order pick between an
 * island and the shore beside it.
 * @param lines - the layer's lines, in backdrop pixels
 * @param at - the pointer, in backdrop pixels
 * @param radius - how far it may be, in backdrop pixels
 * @returns the nearest vertex in reach, or `null`
 */
export function nearestLineVertex(
  lines: readonly SnapLine[],
  at: Point,
  radius: number
): LineVertex | null {
  const limit = squaredRadius(radius)
  let best: LineVertex | null = null
  let bestDistance = Infinity
  lines.forEach((contour, index) => {
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
export function lineStretch(contour: SnapLine, from: number, to: number): Point[] {
  return lineStretches(contour, from, to)[0] ?? []
}

/**
 * Every way along a contour between two of its vertices, both ends included, the shorter first — two
 * on a closed contour, one on an open one, none when either is not a vertex of it. What lets the Pen
 * take the long way round when the short one runs back over what it laid (the dev, round the Nile,
 * 2026-10-14).
 * @param contour - the contour
 * @param from - the vertex the stretch starts at
 * @param to - the vertex it ends at
 * @returns the runs, the shorter first
 */
export function lineStretches(contour: SnapLine, from: number, to: number): Point[][] {
  const { points } = contour
  if (!contour.closed) {
    const run = subPathBetween(points, from, to)
    return run.length === 0 ? [] : [run]
  }
  if (!isVertexOf(points, from) || !isVertexOf(points, to)) return []
  return runsBetween(points, from, to)
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
  return runsBetween(loop, from, to)[0] ?? []
}

/**
 * Both runs of a closed loop between two of its positions, both included — the shorter first, forward
 * first when both are as long.
 * @param loop - the loop, its last item joined to its first
 * @param from - the position the runs start at
 * @param to - the position they end at
 * @returns the two runs; none when either is not a position of the loop
 */
export function runsBetween<T>(loop: readonly T[], from: number, to: number): T[][] {
  const count = loop.length
  if (!Number.isInteger(from) || !Number.isInteger(to)) return []
  if (from < 0 || to < 0 || from >= count || to >= count) return []
  const forward = (to - from + count) % count
  const backward = (from - to + count) % count
  const ahead = walkLoop(loop, from, 1, forward)
  const behind = walkLoop(loop, from, -1, backward)
  return forward <= backward ? [ahead, behind] : [behind, ahead]
}

/**
 * Walk a loop from a position, a number of steps in one direction, collecting every item met.
 * @param loop - the loop
 * @param from - where the walk starts
 * @param step - `1` forward, `-1` backward
 * @param steps - how many steps
 * @returns the items, `steps + 1` of them
 */
function walkLoop<T>(loop: readonly T[], from: number, step: 1 | -1, steps: number): T[] {
  const count = loop.length
  const run: T[] = []
  for (let walked = 0, at = from; walked <= steps; walked += 1) {
    const item = loop[at]
    if (item !== undefined) run.push(item)
    at = (at + step + count) % count
  }
  return run
}
