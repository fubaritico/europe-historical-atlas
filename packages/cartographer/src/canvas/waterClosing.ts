import { lineStretches } from '../geometry/lineSnap'
import { backdropToLonLat } from '../view/projection'

import { anchorsByPosition } from './borderSnap'
import { TAG } from './consoleTag'
import { layerLines } from './layerHits'
import { sessionPointOf } from './toolSession'

import type { GestureContext } from './toolGestures'
import type { SessionPoint } from './toolSession'
import type { SnapLine } from '../geometry/lineSnap'
import type { Point } from '../view/viewport'
import type { Provenance } from '@europe-historical-atlas/core/editor/documentEdits'

/*
 * The Pen's water, as points of the outline: what a snapped click lays, and what the click that closes
 * the ring lays to follow the coast back to where the outline began (the dev, Danish islands,
 * 2026-10-14). Pure over the gesture context, so exercised through the Pen's own suite.
 */

/**
 * Layer points as points of the outline, each under the layer's provenance — or the anchor a neighbour
 * already has there, joined rather than duplicated.
 * @param context - the session, the frame and the store
 * @param points - the layer points, in backdrop pixels
 * @param provenance - what the layer was drawn from
 * @returns the outline points, in order
 */
export function layerPoints(
  context: GestureContext,
  points: readonly (Point | undefined)[],
  provenance: Provenance
): SessionPoint[] {
  const existing = anchorsByPosition(context)
  const placed: SessionPoint[] = []
  for (const point of points) {
    if (point === undefined) continue
    const at = backdropToLonLat(point, context.frame)
    const anchor = existing(at)
    // An anchor a neighbour already has there is joined with its own provenance, never duplicated.
    const reused =
      anchor === null ? null : sessionPointOf(context.store.getState().document, anchor)
    if (anchor !== null && reused === null) {
      console.error(
        `${TAG} anchor ${String(anchor)} has no declared source; a new point was placed on it.`
      )
    }
    placed.push(reused ?? { at, provenance, anchor: null })
  }
  return placed
}

/**
 * The stretch of water a closing click lays: from the last snapped vertex back to the vertex the outline
 * began on, the short way round, both ends included — when both lie on the same line of the same layer,
 * and the outline still begins and ends there. `null` otherwise, and then the ring closes on a straight
 * segment, as before (the dev, Danish islands, 2026-10-14: *« sinon, ça fait une ligne droite »*).
 * @param context - the session and the snap layers
 * @returns the layer points from the last one placed to the first, in backdrop pixels, or `null`
 */
export function closingStretch(context: GestureContext): Point[] | null {
  const { snap, start, outline } = context.session
  if (snap === null || start === null || start.point !== outline[0]) return null
  if (snap.layer !== start.vertex.layer || snap.contour !== start.vertex.contour) return null
  const line = layerLines(context, snap.layer)[snap.contour]
  if (line === undefined) return null
  const stretch = freshStretch(context, line, snap.vertex, start.vertex.vertex)
  // Two points are the two ends already placed, side by side: the straight closing is the coast.
  return stretch === null || stretch.length <= 2 ? null : stretch
}

/**
 * The way along a line from one vertex to another that runs over nothing the outline already holds:
 * the shorter, or — on a loop, when the shorter runs back over what was laid — the other way round (the
 * dev, round the Nile, 2026-10-14: *« ça superpose des points sur le point et un chemin sur un
 * chemin »*). `null` when every way would: back down an open line, or a loop already laid both ways.
 * @param context - the session and the frame
 * @param line - the line
 * @param from - the vertex the stretch starts at — the last one placed
 * @param to - the vertex it ends at
 * @returns the layer points from `from` to `to`, both included, in backdrop pixels, or `null`
 */
export function freshStretch(
  context: GestureContext,
  line: SnapLine,
  from: number,
  to: number
): Point[] | null {
  for (const run of lineStretches(line, from, to)) {
    if (!retracesOutline(context, run.slice(1, -1))) return run
  }
  return null
}

/**
 * Whether any of these layer points is already a point of the outline — both come from the same layer
 * through the same projection, so a shared point is equal to the bit.
 * @param context - the session and the frame
 * @param points - layer points, in backdrop pixels
 * @returns `true` when one of them was placed already
 */
function retracesOutline(context: GestureContext, points: readonly Point[]): boolean {
  const placed = new Set(context.session.outline.map((point) => String(point.at)))
  return points.some((point) => placed.has(String(backdropToLonLat(point, context.frame))))
}

/**
 * The points a closing click lays between the last one placed and the first — the inside of
 * {@link closingStretch}, each under the layer's provenance; empty when the closing is straight.
 * @param context - the session, the snap layers and the store
 * @returns the points to append before closing
 */
export function closingPoints(context: GestureContext): SessionPoint[] {
  const stretch = closingStretch(context)
  const snap = context.session.snap
  if (stretch === null || snap === null) return []
  return layerPoints(context, stretch.slice(1, -1), context.layers[snap.layer].provenance)
}

/**
 * What the result zone says of a closing that followed the water.
 * @param count - how many points it laid
 * @returns the sentence
 */
export function closingReport(count: number): string {
  return `closed along the water, ${String(count)} ${count === 1 ? 'vertex' : 'vertices'} inserted`
}
