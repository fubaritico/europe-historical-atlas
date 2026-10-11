import { pathsHolding } from '@europe-historical-atlas/core/editor/documentEdits'
import { referencedAnchors } from '@europe-historical-atlas/core/editor/yearDocument'

import { shortestRunBetween } from '../geometry/coastSnap'
import { nearestAmong } from '../geometry/hitTest'

import { TAG } from './consoleTag'
import { sessionPointOf } from './toolSession'

import type { GestureContext } from './toolGestures'
import type { SessionPoint } from './toolSession'

/**
 * The Pen meeting a border that already exists — the dev's request, 2026-10-11: *"le snapping pour les
 * frontières communes"*.
 *
 * **It reuses anchors, it never copies them** (`H-06`, `s00`): the point the Pen lands on *is* the
 * neighbour's anchor, by index, so moving it later moves both borders and no sliver can open. Two
 * clicks on anchors of one ring follow that ring between them — the shared border — the shorter way.
 */

/**
 * The anchor under the pointer that the Pen may land on: any anchor a ring holds, but not one the
 * outline in progress already holds — those are its own points, and the first is the closing.
 * @param context - the document, the session and the projection
 * @param at - the pointer, in screen pixels
 * @returns the anchor's index, or `null`
 */
export function anchorHit(context: GestureContext, at: readonly [number, number]): number | null {
  const held = new Set(context.session.outline.map((point) => point.anchor))
  const candidates = [...referencedAnchors(context.store.getState().document)].filter(
    (index) => !held.has(index)
  )
  return nearestAmong(context.anchorsOnScreen(), candidates, at, context.radius)
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
