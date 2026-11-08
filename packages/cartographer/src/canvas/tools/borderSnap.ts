import { referencedAnchors } from '@europe-historical-atlas/core/data/yearDocument'
import { pathsHolding } from '@europe-historical-atlas/core/editor/documentEdits'

import { nearestAmong } from '../../geometry/hitTest'
import { shortestRunBetween } from '../../geometry/lineSnap'

import { TAG } from './consoleTag'
import { nearestLayer } from './layerHits'
import { sessionPointOf, targetHandles } from './toolSession'

import type { CanvasWords } from '../canvasWords'
import type { LayerHitContext } from './layerHits'
import type { SessionPoint, SnapLayer, ToolSession } from './toolSession'
import type { Point } from '../../viewport/viewport'

/**
 * The Pen meeting a border that already exists — the dev's request, 2026-10-11: *"le snapping pour les
 * frontières communes"*.
 *
 * **It reuses anchors, it never copies them** (`H-06`, `s00`): the point the Pen lands on *is* the
 * neighbour's anchor, by index, so moving it later moves both borders and no sliver can open. Two
 * clicks on anchors of one ring follow that ring between them — the shared border — the shorter way.
 */

/**
 * What the border snap reads of a gesture: the layer lookup's slice (the store, the water, the reach), plus
 * the session, the projected anchors and the result zone. Declared here, never imported from the gestures:
 * their context extends this one.
 */
export interface BorderSnapContext extends LayerHitContext {
  /** The session, mutated in place by the gestures. */
  session: ToolSession
  /** The document's anchors in screen pixels, parallel to its table — the cached projection. */
  anchorsOnScreen: () => readonly Point[]
  /**
   * Say what a gesture did — *"inserted 412 vertices from the coastline"*, the status bar's result
   * zone beside the action (`s02`).
   */
  report: (message: string) => void
  /** What the canvas says, in the page's language. */
  words: CanvasWords
}

/**
 * The anchors the Pen may land on: any anchor a ring holds, but not one the outline in progress already
 * holds — those are its own points, and the first is the closing.
 * @param context - the document and the session
 * @returns their indices
 */
function landable(context: BorderSnapContext): number[] {
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
export function anchorHit(
  context: BorderSnapContext,
  at: readonly [number, number]
): number | null {
  return nearestAmong(context.anchorsOnScreen(), landable(context), at, context.radius)
}

/**
 * The share of the Pen's reach ({@link BorderSnapContext.radius}) within which an anchor counts as aimed at —
 * 3 of its 8 pixels. A share of the reach rather than a pixel count, so it scales with the screen's ratio as
 * the reach does.
 */
export const ANCHOR_AIM_SHARE = 3 / 8

/**
 * An anchor the pointer is right on, which the click lands on rather than on the water. The dev, 2026-11-08:
 * *"tu bascules de mode au clic sur un point"* — what is under the pointer decides the mode, a point before the
 * coast or the river it may lie on. **One exception, which is no mode**: while the run already follows a water,
 * an anchor taken from that same water is reached along it — the click still lands on that anchor, reused by
 * its index, and the stretch between follows the shore instead of cutting across it.
 * @param context - the document, the session, the projection and the layers
 * @param at - the pointer, in screen pixels
 * @param layer - the water nearest the pointer
 * @returns the anchor's index, or `null` when the water takes the click
 */
export function anchorOverWater(
  context: BorderSnapContext,
  at: readonly [number, number],
  layer: SnapLayer
): number | null {
  const aim = context.radius * ANCHOR_AIM_SHARE
  const hit = nearestAmong(context.anchorsOnScreen(), landable(context), at, aim)
  if (hit === null || context.session.snap?.layer !== layer) return hit
  const document = context.store.getState().document
  const source = document.sources.find((each) => each.id === document.anchorSource[hit])
  const water = context.layers[layer].provenance
  return source?.name === water.name && source.licence === water.licence ? null : hit
}

/**
 * The water that takes a Pen click here, if any — the nearer coast or river within reach, unless an anchor
 * is aimed at (`anchorOverWater`, the dev's rule of 2026-11-08).
 *
 * **The one place the order is decided**: the click (`penClick`) and the hover (`snapOffer`) both ask it, so
 * what the Pen announces is what it does.
 * @param context - the document, the session, the projection and the layers
 * @param at - the pointer, in screen pixels
 * @returns the layer, or `null` when an anchor or a free point takes the click
 */
export function waterTaking(
  context: BorderSnapContext,
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
export function borderRunTo(context: BorderSnapContext, to: number): number[] | null {
  const run = ringRunTo(context, to)
  return run === null || crossesOutline(context, run) ? null : run
}

/**
 * The run of a ring between the last joined anchor and `to`, before any check — `null` when no ring
 * holds both.
 *
 * **Under ⟨retrace⟩ the target's own rings are not followed** (`H-46`): the run is drawn to replace a
 * stretch of them, and following one would lay that very stretch back. A neighbour's ring is followed as
 * the Pen follows it — which is what aligns a retrace onto the neighbour's border.
 * @param context - the document and the session
 * @param to - the anchor under the pointer
 * @returns the run of anchor indices, `from` included, or `null`
 */
function ringRunTo(context: BorderSnapContext, to: number): number[] | null {
  const from = context.session.outline.at(-1)?.anchor ?? null
  if (from === null) return null
  const { document, tool, target } = context.store.getState()
  const own = tool === 'retrace' ? new Set(targetHandles(document, target)) : null
  for (const claim of document.claims) {
    if (own !== null && claim.polity === target) continue
    for (const ring of claim.rings) {
      const run = followableRun(ring, from, to, own)
      if (run !== null) return run
    }
  }
  return null
}

/**
 * A ring's run between two of its anchors, the shorter way — unless it lies wholly on the retraced polity's
 * own border. The dev, 2026-11-08: *"ça m'autorise à le faire"* — such a run would lay the stretch being
 * replaced back, so the click goes straight to the anchor instead.
 * @param ring - the ring
 * @param from - the anchor the run leaves
 * @param to - the anchor it reaches
 * @param own - the retraced polity's anchors, or `null` outside ⟨retrace⟩
 * @returns the run, `from` included, or `null`
 */
function followableRun(
  ring: readonly number[],
  from: number,
  to: number,
  own: ReadonlySet<number> | null
): number[] | null {
  const start = ring.indexOf(from)
  const end = ring.indexOf(to)
  if (start < 0 || end < 0) return null
  const run = shortestRunBetween(ring, start, end)
  return own !== null && run.every((anchor) => own.has(anchor)) ? null : run
}

/**
 * Whether a run would pass again through an anchor the outline already holds (ARCH-101): the ring would
 * touch itself there, which nothing downstream refuses. The run's first anchor is the outline's last,
 * so it is not counted.
 * @param context - the session
 * @param run - the run, `from` first
 * @returns `true` when following the run would repeat an anchor of the outline
 */
function crossesOutline(context: BorderSnapContext, run: readonly number[]): boolean {
  const held = new Set(context.session.outline.map((point) => point.anchor))
  return run.slice(1).some((index) => held.has(index))
}

/**
 * Session points for anchors of the document, each the anchor itself, under its own provenance.
 * @param context - the document
 * @param indices - the anchors
 * @returns one point per anchor the document can describe; any other is reported and left out
 */
function anchorPoints(context: BorderSnapContext, indices: readonly number[]): SessionPoint[] {
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
export function anchorClick(context: BorderSnapContext, at: readonly [number, number]): boolean {
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
    context.report(context.words.t('followedBorder', { count: joined.length }))
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
export function anchorSentence(context: BorderSnapContext, hit: number): string {
  const paths = pathsHolding(context.store.getState().document, hit)
  return context.words.t('branching', { paths })
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
  context: BorderSnapContext
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
