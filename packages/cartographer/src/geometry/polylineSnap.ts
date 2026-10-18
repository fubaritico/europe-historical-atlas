import { distanceSquared, squaredRadius } from './hitTest'

import type { Point } from '../viewport/viewport'

/**
 * Snapping to a coastline or a river — *"deux clics, plusieurs centaines de points exacts"*.
 *
 * The central gesture of `s02`: the royal domain's eastern limit in 1100 runs along the Scheldt, the
 * Meuse, the Saône and the Rhône, so drawing France is mostly a snapping job. Two clicks on a polyline
 * insert the whole sub-path between them, with the source's own provenance.
 *
 * **Which polylines, and why the caller must hand them over.** The dev's invariant, 2026-10-05: one may
 * only snap to what the backdrop actually draws, and that holds by construction because both come from
 * the same file — verified, the bake loads `europe-rivers.json` whole and applies **no rank filter**. A
 * river absent from the data (the Saône) is absent from the picture too, so there is nothing to aim at
 * and no mismatch.
 *
 * **The trap inside that invariant, and it is not a vigilance but a wiring rule.** The bake applies
 * `extendRiversToSea` before painting, which *changes the geometry*: Natural Earth stops at the head of
 * an estuary, so the mouths are bridged to the sea. The painted river is the **extended** one. Snap
 * against the raw asset and every estuary offers a target beside the ink — which is exactly where `s02`
 * starts, at the mouth of the Somme and on the Scheldt. So the caller passes **the same array the
 * backdrop was baked from**, extended; this module takes polylines as data and has no opinion on where
 * they came from.
 *
 * Screen pixels throughout, for the reasons in `hitTest`'s header.
 */

/** Where a snap landed. */
export interface PolylineHit {
  /** Which polyline, as an index into the array handed in. */
  polyline: number
  /** Which vertex of it, as an index into that polyline. */
  vertex: number
  /** How far the pointer was, in screen pixels — what the status bar reads. */
  distancePx: number
}

/**
 * The nearest vertex of any polyline, within a radius.
 *
 * **Every polyline is weighed against every other, which is the half the plausible version drops.**
 * Walking the polylines and returning the first one holding a vertex in range reads as the same thing
 * and is not: two rivers meet at a confluence, so the first in storage order wins over the one the
 * pointer is actually on — `s02`'s own case, where the outline leaves the Scheldt for the Meuse.
 *
 * `s02` wants the hit named on screen (*"the nearest vertex on the nearest polyline is highlighted, with
 * the river's name"*), so the name is the caller's to look up: this returns indices, never labels.
 * @param polylines - the lines to snap to, in screen pixels, the same set the backdrop draws
 * @param at - where the pointer is, in screen pixels
 * @param radiusPx - how far the pointer may be and still snap
 * @returns the nearest vertex in range, or `null` when nothing is — which is what makes the status bar
 *   say "no river within …" and the click place an ordinary free point
 */
export function nearestVertexOnPolylines(
  polylines: readonly (readonly Point[])[],
  at: Point,
  radiusPx: number
): PolylineHit | null {
  const limit = squaredRadius(radiusPx)
  let best: PolylineHit | null = null
  let bestDistance = Infinity
  for (let line = 0; line < polylines.length; line += 1) {
    const polyline = polylines[line]
    if (polyline === undefined) continue
    for (let vertex = 0; vertex < polyline.length; vertex += 1) {
      const point = polyline[vertex]
      if (point === undefined) continue
      const distance = distanceSquared(point, at)
      if (distance <= limit && distance < bestDistance) {
        best = { polyline: line, vertex, distancePx: Math.sqrt(distance) }
        bestDistance = distance
      }
    }
  }
  return best
}

/**
 * Whether an index names a vertex of a polyline.
 *
 * Extracted because the readability budget said so — `subPathBetween` scored a complexity of 11 against
 * a ceiling of 10 — and the split is the right one rather than a way round the rule: deciding whether an
 * index is a vertex is a different question from walking between two that are.
 * @param polyline - the line to check against
 * @param index - the index to check
 * @returns `true` when the polyline holds a vertex at that index
 */
export function isVertexOf(polyline: readonly Point[], index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < polyline.length
}

/**
 * The stretch of a polyline between two of its vertices, both included, in walking order.
 *
 * **It walks whichever way the author clicked, and that is what the plausible version gets wrong.** A
 * `slice(from, to + 1)` is right downstream and returns an **empty array** upstream — so clicking the
 * Scheldt at its mouth and then inland inserts several hundred points, while clicking inland first
 * inserts nothing, with no error. `s02` never says which way round the two clicks come.
 *
 * The returned points are the polyline's own, so the caller inserts *exact* vertices rather than
 * resampled ones — which is what lets the status bar say *"inserted 412 vertices from the coastline"* and
 * what makes the provenance honest.
 * @param polyline - the line to take a stretch of
 * @param from - the vertex the author clicked first
 * @param to - the vertex they clicked second
 * @returns the vertices from `from` to `to` inclusive, in that order; empty when either index is outside
 *   the polyline, which is a caller fault rather than a shape with no stretch
 */
export function subPathBetween(polyline: readonly Point[], from: number, to: number): Point[] {
  if (!isVertexOf(polyline, from) || !isVertexOf(polyline, to)) return []
  const step = to >= from ? 1 : -1
  const stretch: Point[] = []
  for (let index = from; ; index += step) {
    const point = polyline[index]
    if (point !== undefined) stretch.push(point)
    if (index === to) break
  }
  return stretch
}
