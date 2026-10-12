import { TAG } from './consoleTag'
import { gestureOf, snapReachOf, tooFarToEdit } from './liveCanvas'
import { arrowRelease, penClick } from './toolGestures'
import { dropDrag } from './toolSession'

import type { LiveCanvas } from './liveCanvas'
import type { Point } from '../view/viewport'

/**
 * What a tool does when the button comes up or a key is pressed — and what it refuses to do from too far
 * out (`H-34`).
 *
 * Out of `controller.ts` on 2026-10-12, when the far-view refusals pushed it past its line budget. The
 * controller still decides *whose* gesture it is (the hand's or a tool's); this decides what the tool
 * does with it.
 */

/**
 * Say that a gesture was refused because the view is too far out — in the result zone, where the author
 * is looking, and in the console, where a later failure can be traced (`rules/error-handling.md`, *no
 * refusal is silent*). Once per gesture, never per pointer move.
 * @param it - the attachment
 * @param verb - what was refused
 */
export function refuseFromAfar(it: LiveCanvas, verb: 'draw' | 'edit'): void {
  const reach = snapReachOf(it)
  const from = Number.isFinite(reach)
    ? `the snap would reach ${String(Math.round(reach))} km`
    : 'the view is not framed yet'
  const message = `too far to ${verb} — zoom in (${from}; the tools act within ${String(it.deps.maxSnapReachKm)} km)`
  console.warn(`${TAG} ${message}`)
  it.deps.onResult(message)
}

/**
 * Refuse, from too far out, the keys that would change the document: ‹delete› and ‹backspace› on the white
 * arrow's selection, ‹enter› closing the Pen's outline. Found in review (QUAL-001, 2026-10-12): a selection
 * survives a zoom out, so ‹delete› removed anchors the author could no longer see.
 *
 * **What stays allowed, deliberately**: ‹escape› (dropping a selection or an outline changes nothing), the
 * Pen's ‹backspace› (it takes back an anchor of the outline in progress, never one of the document), and
 * undo — throwing work away or going back must always be possible from afar.
 * @param it - the attachment
 * @param key - the key, as `KeyboardEvent.key`
 * @returns `true` when the key was refused, and said so
 */
export function keyRefusedFromAfar(it: LiveCanvas, key: string): boolean {
  if (!tooFarToEdit(it)) return false
  const tool = it.deps.store.getState().tool
  const deletes = tool === 'edit' && (key === 'Delete' || key === 'Backspace')
  const closes = tool === 'draw' && key === 'Enter' && it.session.outline.length > 0
  if (deletes && it.session.selected.length > 0) refuseFromAfar(it, 'edit')
  else if (closes) refuseFromAfar(it, 'draw')
  else return false
  return true
}

/**
 * Finish a tool's press: the white arrow releases (a click, a marquee, a move), the Pen places — unless
 * the view is too far out. From afar the arrow's click still chooses a polity (its press was recorded as a
 * bare click), but a drag is refused; the Pen and the Pencil are refused outright.
 * @param it - the attachment
 * @param at - where the button came up, in screen pixels
 * @param dragged - whether the press travelled far enough to be a drag
 */
export function releaseTool(it: LiveCanvas, at: Point, dragged: boolean): void {
  const tool = it.deps.store.getState().tool
  const tooFar = tooFarToEdit(it)
  if (tool === 'edit') {
    if (dragged && tooFar) {
      dropDrag(it.session)
      refuseFromAfar(it, 'edit')
    } else arrowRelease(gestureOf(it), at)
    // The selection is painted on the static canvas: a marquee chooses its anchors on release, and
    // without this they showed as selected only at the next press (the dev, 2026-10-12).
    it.requestPaint()
    return
  }
  if (tool !== 'draw') return
  if (tooFar) refuseFromAfar(it, 'draw')
  else if (!dragged) penClick(gestureOf(it), at)
}
