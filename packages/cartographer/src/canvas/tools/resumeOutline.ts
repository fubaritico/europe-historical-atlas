import { isRingOpen } from '@europe-historical-atlas/core/data/outlines'

import { describeDrawingTarget } from '../../state/drawingTarget'

import { TAG } from './consoleTag'
import { sessionPointOf } from './toolSession'

import type { BorderSnapContext } from './borderSnap'
import type { SessionPoint } from './toolSession'
import type { Point } from '../../viewport/viewport'
import type { Carving, CarvingHeld } from '@europe-historical-atlas/core/editor/carve'
import type { OutlinePoint } from '@europe-historical-atlas/core/editor/documentEdits'
import type { HistoryStep } from '@europe-historical-atlas/core/editor/history'

/**
 * Resuming an open outline with the Pen, and keeping the outline in hand when the author changes polity
 * (`files/plans/cartographer/open-outlines.md`, the dev, 2026-11-05: *"an outline must be allowed not to be closed — one
 * must be able to stop it, resume it"*; *"closed or not, an outline is saved when you change polity"*).
 *
 * - **A Pen click on an end of an open outline of the polity selected**, nothing in hand, takes it up: its points come
 *   into the Pen in order, the end clicked last, and the next clicks go on from there. A click on its other end closes
 *   it, as any outline closes on its first point.
 * - **Changing polity keeps the outline in hand** — a new one, or one taken up — open, one step of the history.
 */

/** The step kind an outline kept on a change of polity, or closed after being resumed, is recorded under. */
export const KEEP_OUTLINE_KIND = 'keep-outline'

/** An end of an open outline under the pointer. */
interface OpenEnd {
  /** The outline's position in the polity's claim. */
  at: number
  /** Its anchors. */
  ring: readonly number[]
  /** Whether the end clicked is its first anchor — the outline then comes into the Pen reversed. */
  first: boolean
}

/**
 * The end of an open outline of the polity selected nearest the pointer, within the Pen's reach.
 * @param context - the session and the store
 * @param polityId - the polity selected
 * @param at - the pointer, in screen pixels
 * @returns the end, or `null` when none is within reach
 */
function openEndAt(context: BorderSnapContext, polityId: string, at: Point): OpenEnd | null {
  const claim = context.store.getState().document.claims.find((each) => each.polity === polityId)
  if (claim === undefined) return null
  const onScreen = context.anchorsOnScreen()
  const ends = claim.rings.flatMap((ring, position): (OpenEnd & { index: number | undefined })[] =>
    isRingOpen(claim, position)
      ? [
          { at: position, ring, first: true, index: ring[0] },
          { at: position, ring, first: false, index: ring.at(-1) },
        ]
      : []
  )
  let best: { end: OpenEnd; distance: number } | null = null
  for (const { index, ...end } of ends) {
    const point = index === undefined ? undefined : onScreen[index]
    const distance = point === undefined ? Infinity : Math.hypot(point[0] - at[0], point[1] - at[1])
    if (distance <= context.radius && (best === null || distance < best.distance))
      best = { end, distance }
  }
  return best?.end ?? null
}

/**
 * Take up an open outline of the polity selected where the Pen clicks one of its ends, nothing in hand.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 * @returns `true` when the click took an outline up — or was refused, and said
 */
export function resumeClick(context: BorderSnapContext, at: Point): boolean {
  const state = context.store.getState()
  const target = describeDrawingTarget(state.document, state.target)
  if (target === null || context.session.outline.length > 0) return false
  const end = openEndAt(context, target.id, at)
  if (end === null) return false
  const { document } = context.store.getState()
  const points: SessionPoint[] = []
  for (const index of end.ring) {
    const point = sessionPointOf(document, index)
    if (point === null) {
      console.error(
        `${TAG} the open outline of "${target.id}" holds anchor ${String(index)}, which the map cannot describe.`
      )
      return true
    }
    points.push(point)
  }
  context.session.outline = end.first ? points.reverse() : points
  context.session.resumed = { polity: target.id, at: end.at, anchors: [...end.ring] }
  context.report(context.words.t('resumedOutline', { name: target.name }))
  return true
}

/**
 * Keep the outline in hand, open, for the polity it was drawn for — what a change of polity does, so nothing drawn is
 * lost (the dev, 2026-11-05). An outline taken up and left as it was changes nothing, and records nothing.
 * @param context - the session and the store
 * @param polityId - the polity the outline was drawn for — the one selected before the change
 */
export function keepOutlineInHand(context: BorderSnapContext, polityId: string): void {
  const { session, store } = context
  const { resumed, outline } = session
  if (outline.length < 2) return
  const anchors = outline.map((point) => point.anchor)
  const held = resumed?.polity === polityId ? resumed : null
  if (
    held !== null &&
    (sameRun(anchors, held.anchors) || sameRun([...anchors].reverse(), held.anchors))
  )
    return
  const name = store.getState().document.polities.find((polity) => polity.id === polityId)?.name
  if (name === undefined) {
    console.error(
      `${TAG} the outline in hand was drawn for "${polityId}", which the map no longer holds: it is lost.`
    )
    return
  }
  const step = { kind: KEEP_OUTLINE_KIND, label: context.words.t('stepKeepOutline', { name }) }
  if (store.getState().keepOutline(polityId, held, outline, true, step)) {
    context.report(context.words.t('keptOutline', { name }))
    return
  }
  console.error(
    `${TAG} the open outline of "${polityId}" was refused by the map: it is lost with the change of polity.`
  )
}

/**
 * Whether the points in hand are an outline's anchors, in order.
 * @param anchors - the anchor each point in hand is, `null` for a new point
 * @param ring - the outline's anchors
 * @returns `true` when they are the same
 */
function sameRun(anchors: readonly (number | null)[], ring: readonly number[]): boolean {
  return anchors.length === ring.length && anchors.every((anchor, i) => anchor === ring[i])
}

/**
 * Close the outline in hand into the polity's territory, one step: an outline the Pen took up is put back in its
 * place, closed now; a new one is drawn, a vassal's carving its suzerain.
 * @param context - the session and the store
 * @param polityId - the polity closed
 * @param outline - the points, the closing ones laid
 * @param step - how the gesture is named
 * @param onCarved - told what the carving did
 * @param front - closed with ‹alt›: the outline takes the ground of its whole family
 * @returns whether the document took it
 */
export function closeInHand(
  context: BorderSnapContext,
  polityId: string,
  outline: readonly OutlinePoint[],
  step: HistoryStep,
  onCarved: (carving: Carving | CarvingHeld) => void,
  front = false
): boolean {
  const { resumed } = context.session
  const state = context.store.getState()
  return resumed?.polity === polityId
    ? state.keepOutline(polityId, resumed, outline, false, step, onCarved, front)
    : state.drawOutline(polityId, outline, step, onCarved, front)
}
