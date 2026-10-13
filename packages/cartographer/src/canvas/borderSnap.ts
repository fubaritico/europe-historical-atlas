import { pathsHolding } from '@europe-historical-atlas/core/editor/documentEdits'
import { referencedAnchors } from '@europe-historical-atlas/core/editor/yearDocument'

import { nearestAmong } from '../geometry/hitTest'
import { shortestRunBetween } from '../geometry/lineSnap'

import { TAG } from './consoleTag'
import { nearestLayer } from './layerHits'
import { sessionPointOf } from './toolSession'

import type { GestureContext } from './toolGestures'
import type { SessionPoint, SnapLayer } from './toolSession'

/**
 * The Pen meeting a border that already exists — the dev's request, 2026-10-11: *"le snapping pour les
 * frontières communes"*.
 *
 * **It reuses anchors, it never copies them** (`H-06`, `s00`): the point the Pen lands on *is* the
 * neighbour's anchor, by index, so moving it later moves both borders and no sliver can open. Two
 * clicks on anchors of one ring follow that ring between them — the shared border — the shorter way.
 */

/**
 * The anchors the Pen may land on: any anchor a ring holds, but not one the outline in progress already
 * holds — those are its own points, and the first is the closing.
 * @param context - the document and the session
 * @returns their indices
 */
function landable(context: GestureContext): number[] {
  const held = new Set(context.session.outline.map((point) => point.anchor))
  return [...referencedAnchors(context.store.getState().document)].filter(
    (index) => !held.has(index)
  )
}

/**
 * The anchor under the pointer that the Pen may land on.
 * @param context - the document, the session and the projection
 * @param at - the pointer, in screen pixels
 * @returns the anchor's index, or `null`
 */
export function anchorHit(context: GestureContext, at: readonly [number, number]): number | null {
  return nearestAmong(context.anchorsOnScreen(), landable(context), at, context.radius)
}

/**
 * The share of the Pen's reach ({@link GestureContext.radius}) within which an anchor counts as aimed at —
 * 3 of its 8 pixels. A share of the reach rather than a pixel count, so it scales with the screen's ratio as
 * the reach does.
 */
export const ANCHOR_AIM_SHARE = 3 / 8

/**
 * An anchor the pointer is right on that the water under it would **not** reuse — one placed by eye, or
 * taken from another layer — so the click lands on it rather than on the water. An anchor that came from
 * that water stays behind it: the water click reuses it anyway, which keeps a neighbour's coast intact.
 *
 * A source the document does not declare cannot reach here: a year whose anchor names one is refused when
 * it is read.
 * @param context - the document, the session, the projection and the layers
 * @param at - the pointer, in screen pixels
 * @param layer - the water the click would otherwise take
 * @returns the anchor's index, or `null` when the water should take the click
 */
export function anchorOverWater(
  context: GestureContext,
  at: readonly [number, number],
  layer: SnapLayer
): number | null {
  const aim = context.radius * ANCHOR_AIM_SHARE
  const hit = nearestAmong(context.anchorsOnScreen(), landable(context), at, aim)
  if (hit === null) return null
  const document = context.store.getState().document
  const source = document.sources.find((each) => each.id === document.anchorSource[hit])
  const water = context.layers[layer].provenance
  return source?.name === water.name && source.licence === water.licence ? null : hit
}

/**
 * The water that takes a Pen click here, if any — the nearer coast or river within reach, unless an anchor
 * is aimed at that it would not reuse (`anchorOverWater`, `s99` H-36 as rectified 2026-10-13).
 *
 * **The one place the order is decided**: the click (`penClick`) and the hover (`snapOffer`) both ask it, so
 * what the Pen announces is what it does.
 * @param context - the document, the session, the projection and the layers
 * @param at - the pointer, in screen pixels
 * @returns the layer, or `null` when an anchor or a free point takes the click
 */
export function waterTaking(
  context: GestureContext,
  at: readonly [number, number]
): SnapLayer | null {
  const layer = nearestLayer(context, at)
  return layer === null || anchorOverWater(context, at, layer) !== null ? null : layer
}

/**
 * The anchors a click on `to` would follow, when the outline ends on an anchor `from` and some ring
 * holds both: the ring's run between them, the shorter way, `from` included. `null` when there is no
 * such ring — the click then only lands on `to`.
 * @param context - the document and the session
 * @param to - the anchor under the pointer
 * @returns the run of anchor indices, or `null`
 */
export function borderRunTo(context: GestureContext, to: number): number[] | null {
  const run = ringRunTo(context, to)
  return run === null || crossesOutline(context, run) ? null : run
}

/**
 * The run of a ring between the last joined anchor and `to`, before any check — `null` when no ring
 * holds both.
 * @param context - the document and the session
 * @param to - the anchor under the pointer
 * @returns the run of anchor indices, `from` included, or `null`
 */
function ringRunTo(context: GestureContext, to: number): number[] | null {
  const from = context.session.outline.at(-1)?.anchor ?? null
  if (from === null) return null
  for (const claim of context.store.getState().document.claims) {
    for (const ring of claim.rings) {
      const start = ring.indexOf(from)
      const end = ring.indexOf(to)
      if (start >= 0 && end >= 0) return shortestRunBetween(ring, start, end)
    }
  }
  return null
}

/**
 * Whether a run would pass again through an anchor the outline already holds (ARCH-101): the ring would
 * touch itself there, which nothing downstream refuses. The run's first anchor is the outline's last,
 * so it is not counted.
 * @param context - the session
 * @param run - the run, `from` first
 * @returns `true` when following the run would repeat an anchor of the outline
 */
function crossesOutline(context: GestureContext, run: readonly number[]): boolean {
  const held = new Set(context.session.outline.map((point) => point.anchor))
  return run.slice(1).some((index) => held.has(index))
}

/**
 * Session points for anchors of the document, each the anchor itself, under its own provenance.
 * @param context - the document
 * @param indices - the anchors
 * @returns one point per anchor the document can describe; any other is reported and left out
 */
function anchorPoints(context: GestureContext, indices: readonly number[]): SessionPoint[] {
  const { document } = context.store.getState()
  return indices.flatMap((index) => {
    const point = sessionPointOf(document, index)
    if (point === null) {
      console.error(`${TAG} anchor ${String(index)} has no declared source; it was not joined.`)
      return []
    }
    return [point]
  })
}

/**
 * A Pen click on an existing anchor: join it, and follow the border back to the last joined anchor
 * when one ring holds both.
 * @param context - the session, the document and the report
 * @param at - the pointer, in screen pixels
 * @returns `true` when the click landed on an anchor
 */
export function anchorClick(context: GestureContext, at: readonly [number, number]): boolean {
  const hit = anchorHit(context, at)
  if (hit === null) return false
  const run = borderRunTo(context, hit)
  if (run === null && ringRunTo(context, hit) !== null) {
    console.warn(
      `${TAG} the shared border runs back through the outline's own anchors: only the anchor was joined.`
    )
  }
  const joined = anchorPoints(context, run === null ? [hit] : run.slice(1))
  context.session.outline.push(...joined)
  context.session.snap = null
  if (run !== null) {
    const noun = joined.length === 1 ? 'anchor' : 'anchors'
    context.report(`followed ${String(joined.length)} ${noun} of a shared border`)
  }
  return true
}

/**
 * The status sentence for an anchor the Pen is over — `s02`'s *"Branching from a shared anchor — held by
 * 2 paths"*.
 * @param context - the document
 * @param hit - the anchor under the pointer
 * @returns the sentence
 */
export function anchorSentence(context: GestureContext, hit: number): string {
  const paths = pathsHolding(context.store.getState().document, hit)
  return `Branching from a shared anchor — held by ${String(paths)} ${paths === 1 ? 'path' : 'paths'}`
}

/**
 * The existing anchors by position, for the coast to reuse: a coast vertex already placed as an anchor
 * — a neighbour drawn along the same shore — is that anchor, not a second point on the same spot.
 *
 * **Exact equality, no tolerance**, and that is sound rather than lucky: an anchor placed from the coast
 * is `backdropToLonLat` of its vertex, deterministic, and nothing rounds it at save. A free point near
 * the shore never equals a vertex, so it is never captured. The outline's own anchors are left out:
 * reusing one would fold the ring back on itself.
 * @param context - the store and the session
 * @returns the anchor at a position, or `null`
 */
export function anchorsByPosition(
  context: GestureContext
): (lonLat: readonly [number, number]) => number | null {
  const { document } = context.store.getState()
  const held = new Set(context.session.outline.map((point) => point.anchor))
  const byKey = new Map<string, number>()
  for (const index of referencedAnchors(document)) {
    const anchor = document.anchors[index]
    if (anchor !== undefined && !held.has(index))
      byKey.set(`${String(anchor[0])},${String(anchor[1])}`, index)
  }
  return (lonLat) => byKey.get(`${String(lonLat[0])},${String(lonLat[1])}`) ?? null
}
