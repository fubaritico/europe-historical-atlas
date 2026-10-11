import { nearestAmong } from '../geometry/hitTest'
import { canCloseRing, isClosingOffered } from '../geometry/ringClosure'
import { describeDrawingTarget } from '../state/drawingTarget'
import { lonLatToScreen, screenToLonLatOnBackdrop } from '../view/projection'

import { targetHandles } from './toolSession'

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
  if (target === null || !canCloseRing(context.session.outline)) return
  const step = { kind: 'draw-outline', label: `draw outline of ${target.name}` }
  if (context.store.getState().drawOutline(target.id, context.session.outline, step)) {
    context.session.outline = []
  }
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
  if (resolvedTarget(context) === null) return
  if (isClosingOffered(outlineOnScreen(context), at, context.radius)) {
    closeOutline(context)
    return
  }
  const point = lonLatAt(context, at)
  if (point !== null) context.session.outline.push(point)
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
  if (moving !== null)
    context.store.getState().moveAnchor(moving.index, moving.to, MOVE_ANCHOR_STEP)
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
  else if (key === 'Escape') context.session.outline = []
  else if (key === 'Enter') closeOutline(context)
  else return false
  return true
}
