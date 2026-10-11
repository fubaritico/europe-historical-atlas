import { nearestAmong } from '../geometry/hitTest'
import { canCloseRing, isClosingOffered } from '../geometry/ringClosure'
import { describeDrawingTarget } from '../state/drawingTarget'
import { lonLatToScreen, screenToLonLatOnBackdrop } from '../view/projection'

import { abandonGesture, dropDrag, targetHandles } from './toolSession'

import type { ToolSession } from './toolSession'
import type { CartographerStoreHook } from '../state/store'
import type { BackdropFrame } from '../view/projection'
import type { Point } from '../view/viewport'

/**
 * What the Pen and the white arrow do with a press, a drag, a release and a key.
 *
 * **Out of `controller.ts` so each gesture reads alone**, the split ARCH-012 asks for: the controller
 * keeps the listeners and decides *whether* a gesture is a tool's or the hand's; these decide what the
 * tool's gesture means. They write only to the session they are handed and act on the document only
 * through the store's recorded actions — so every change they make is one undo step or nothing.
 */

/** What a gesture needs to read and where it may write. */
export interface GestureContext {
  /** The store: the document, the view, the tool, the target, and the recorded actions. */
  store: CartographerStoreHook
  /** The backdrop's coordinate system, for turning the pointer into degrees. */
  frame: BackdropFrame
  /** The session, mutated in place by the gestures. */
  session: ToolSession
  /** The document's anchors in screen pixels, parallel to its table — the cached projection. */
  anchorsOnScreen: () => readonly Point[]
  /** How near, in screen pixels, a press must be to catch a handle or the first anchor. */
  radius: number
}

/**
 * Every refusal says so, in the console at least — the dev's rule, 2026-10-11: *"faut prévenir, faut tout
 * couvrir."* Two levels, and the line between them is whether anything should have prevented it:
 *
 * - `console.warn` for a gesture of the author's the tool declines — a click off the backdrop, ‹enter›
 *   on two anchors. Ordinary, and worth a line because the screen may show nothing;
 * - `console.error` for what no gesture should reach — the document refusing what the tool already
 *   checked. A defect, said loudly, never swallowed.
 */
const TAG = '[Cartographer]'

/** The step kind a closed outline is recorded under — what tells an undo that it is undoing a closing. */
export const DRAW_OUTLINE_KIND = 'draw-outline'

/** How `{History}` and `[↶ Undo]` name a moved anchor — `s03`'s *"Undo — move anchor"*. */
export const MOVE_ANCHOR_STEP = { kind: 'move-anchor', label: 'move anchor' } as const

/**
 * Where the pointer is, in degrees — or `null` off the backdrop.
 *
 * **Off the map a click places nothing**, the same rule as the status bar's: the vellum around the
 * backdrop is not a place, and a latitude extrapolated past its edge would be arithmetic presented as a
 * fact.
 * @param context - the frame and the store's view
 * @param at - the pointer, in screen pixels
 * @returns `[longitude, latitude]`, or `null`
 */
export function lonLatAt(context: GestureContext, at: Point): [number, number] | null {
  return screenToLonLatOnBackdrop(at, context.frame, context.store.getState().viewport)
}

/**
 * The outline in progress, in screen pixels.
 * @param context - the session, the frame and the view
 * @returns one screen point per anchor placed
 */
export function outlineOnScreen(context: GestureContext): Point[] {
  const viewport = context.store.getState().viewport
  return context.session.outline.map((point) => lonLatToScreen(point, context.frame, viewport))
}

/**
 * The name of the polity the tools act on, or `null` when nobody is aimed at or the target is gone.
 * @param context - the store
 * @returns the target's name and id, or `null`
 */
export function resolvedTarget(context: GestureContext): { id: string; name: string } | null {
  const state = context.store.getState()
  return describeDrawingTarget(state.document, state.target)
}

/**
 * Close the outline in progress into the target's territory, as one step.
 *
 * The session is emptied only when the document took it: a refused outline stays on screen, so nothing
 * the author placed is lost to a refusal.
 * @param context - the session and the store
 */
export function closeOutline(context: GestureContext): void {
  const target = resolvedTarget(context)
  if (target === null) {
    console.warn(`${TAG} the outline was not closed: no polity is selected to close it into.`)
    return
  }
  if (!canCloseRing(context.session.outline)) {
    console.warn(`${TAG} the outline was not closed: a ring needs at least three anchors.`)
    return
  }
  const step = { kind: DRAW_OUTLINE_KIND, label: `draw outline of ${target.name}` }
  if (context.store.getState().drawOutline(target.id, context.session.outline, step)) {
    context.session.outline = []
    context.session.reopened = null
    return
  }
  console.error(
    `${TAG} the document refused the outline of "${target.id}" after the tool had checked it.`
  )
}

/**
 * A Pen click: close the ring if the first anchor is offering, otherwise place an anchor.
 *
 * **With no target it does nothing**, and that is the refusal `s02` specifies — the cursor already says
 * `not-allowed` and the status bar says which polity to select first.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 */
export function penClick(context: GestureContext, at: Point): void {
  if (resolvedTarget(context) === null) {
    console.warn(`${TAG} no anchor placed: select a polity to draw in first.`)
    return
  }
  if (isClosingOffered(outlineOnScreen(context), at, context.radius)) {
    closeOutline(context)
    return
  }
  const point = lonLatAt(context, at)
  if (point === null) {
    console.warn(`${TAG} no anchor placed: the click was off the map.`)
    return
  }
  context.session.outline.push(point)
}

/**
 * A press with the white arrow: select the target's handle under the pointer, or clear the selection.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 */
export function arrowPress(context: GestureContext, at: Point): void {
  const target = resolvedTarget(context)
  const candidates =
    target === null ? [] : targetHandles(context.store.getState().document, target.id)
  const hit = nearestAmong(context.anchorsOnScreen(), candidates, at, context.radius)
  context.session.selected = hit
  context.session.grabbed = hit
}

/**
 * A drag with the white arrow: the grabbed anchor follows the pointer, in the session only.
 *
 * **The document is not touched until release** — a drag writes a preview, the release writes one step.
 * Off the backdrop the anchor stays where it last landed rather than following the pointer onto the
 * vellum.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 */
export function arrowDrag(context: GestureContext, at: Point): void {
  const index = context.session.grabbed
  if (index === null) return
  const to = lonLatAt(context, at)
  if (to !== null) context.session.moving = { index, to }
}

/**
 * Release the white arrow: a drag in progress becomes one recorded move.
 * @param context - the session and the store
 */
export function arrowRelease(context: GestureContext): void {
  const moving = context.session.moving
  context.session.moving = null
  context.session.grabbed = null
  if (moving === null) return
  if (!context.store.getState().moveAnchor(moving.index, moving.to, MOVE_ANCHOR_STEP)) {
    console.error(`${TAG} the document refused to move anchor ${String(moving.index)}.`)
  }
}

/**
 * The Pen's keys: ‹backspace› takes back the last anchor, ‹escape› abandons the outline, ‹enter› closes it.
 *
 * Under ⟨edit⟩, ‹escape› drops the selection. ‹delete› is not bound: deleting an anchor is the next rung.
 * @param context - the session and the store
 * @param key - the key, as `KeyboardEvent.key`
 * @returns whether the key was the tools', so the caller can stop it
 */
export function toolKey(context: GestureContext, key: string): boolean {
  const tool = context.store.getState().tool
  if (tool === 'edit' && key === 'Escape') {
    context.session.selected = null
    return true
  }
  if (tool !== 'draw' || context.session.outline.length === 0) return false
  if (key === 'Backspace') context.session.outline.pop()
  else if (key === 'Escape') {
    context.session.outline = []
    context.session.reopened = null
  } else if (key === 'Enter') closeOutline(context)
  else return false
  return true
}

/**
 * The rings a polity holds, as lists of anchor indices.
 * @param context - the store
 * @param polityId - whose rings
 * @returns its rings, in the order they were closed
 */
function ringsOf(context: GestureContext, polityId: string): number[][] {
  const claim = context.store.getState().document.claims.find((held) => held.polity === polityId)
  return claim?.rings ?? []
}

/**
 * A ring's points, read off the document as it stands.
 * @param context - the store
 * @param ring - the anchor indices
 * @returns `[longitude, latitude]` per anchor, copied
 */
function pointsOf(context: GestureContext, ring: readonly number[]): [number, number][] {
  const anchors = context.store.getState().document.anchors
  return ring.flatMap((index) => {
    const anchor = anchors[index]
    return anchor === undefined ? [] : [[anchor[0], anchor[1]] as [number, number]]
  })
}

/**
 * Undo the last step; if it was the closing of the outline the Pen is drawing, put its points back in
 * hand — the dev's call, 2026-10-11: *"que ça enlève juste la fermeture de la zone"*, as Illustrator does.
 *
 * **The document's history is untouched by this**: a ring still enters the document closed, in one step,
 * so a saved file never holds an open outline. Only the session is given the points back.
 *
 * It reopens only when the step undone took a ring away from the polity the Pen is drawing for. Undoing
 * a closing under another tool, or for another polity, takes the ring back without handing anything —
 * and says so (`rules/error-handling.md`, no refusal is silent).
 * @param context - the session and the store
 */
function undoAndReopen(context: GestureContext): void {
  const state = context.store.getState()
  const closing = state.rows.find((row) => row.current)?.kind === DRAW_OUTLINE_KIND
  const target = state.tool === 'draw' ? resolvedTarget(context) : null
  const before = target === null ? [] : ringsOf(context, target.id)
  const last = before.at(-1)
  const points = last === undefined ? [] : pointsOf(context, last)
  state.undo()
  if (!closing) return
  const after = target === null ? before.length : ringsOf(context, target.id).length
  if (after === before.length - 1 && points.length > 0) {
    context.session.outline = points
    context.session.reopened = points.map((point): [number, number] => [point[0], point[1]])
    return
  }
  console.warn(
    `${TAG} the closing was undone; no outline was put back, the Pen is not drawing for it.`
  )
}

/**
 * ‹ctrl+Z›, one step at a time: a drag in progress is dropped, an open outline loses its last anchor,
 * and only then is the last recorded gesture taken back — reopening the outline it closed, if it did.
 *
 * **The gesture in progress first** (`H-10` applied to the session, and ARCH-001 / QUAL-001): an
 * anchor still under the button is not in the line, so rewinding the document under it would have the
 * release write onto the rewound document.
 *
 * At the origin there is nothing to take back, which is ordinary — and said, once per press: a held key
 * repeats, and the history is walked on repeat (as in Illustrator) but the warning is not.
 * @param context - the session and the store
 * @param repeat - whether this is the key's auto-repeat rather than a press
 */
export function undoGesture(context: GestureContext, repeat: boolean): void {
  if (dropDrag(context.session)) return
  if (context.session.outline.length > 0) {
    context.session.outline.pop()
    return
  }
  if (!context.store.getState().canUndo) {
    if (!repeat) console.warn(`${TAG} nothing to undo.`)
    return
  }
  undoAndReopen(context)
}

/**
 * Whether the outline in hand is exactly what an undo reopened — the case where a redo closes it again.
 * @param session - the session
 * @returns `true` when the author has not changed the reopened outline
 */
function stillReopened(session: ToolSession): boolean {
  const reopened = session.reopened
  if (reopened?.length !== session.outline.length) return false
  return reopened.every((point, index) => {
    const held = session.outline[index]
    return held === undefined ? false : held[0] === point[0] && held[1] === point[1]
  })
}

/**
 * ‹ctrl+shift+Z›: apply an undone gesture again.
 *
 * After an undo reopened an outline and the author left it as it was, the redo closes it again and
 * empties the hand — otherwise the ring would come back with its points still in hand over it. Any
 * other gesture in progress is dropped first, and the redo waits for the next press. Nothing to redo is
 * ordinary — and said, once per press.
 * @param context - the session and the store
 * @param repeat - whether this is the key's auto-repeat rather than a press
 */
export function redoGesture(context: GestureContext, repeat: boolean): void {
  const reclose = context.session.outline.length > 0 && stillReopened(context.session)
  if (abandonGesture(context.session) && !reclose) {
    console.warn(`${TAG} the gesture in progress was dropped; redo again to apply the undone step.`)
    return
  }
  const state = context.store.getState()
  if (!state.canRedo) {
    if (!repeat) console.warn(`${TAG} nothing to redo.`)
    return
  }
  state.redo()
}
