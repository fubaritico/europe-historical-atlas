import { snapToFrameEdge } from '../viewport/frameEdge'
import { backdropToLonLat, screenToLonLatOnBackdrop } from '../viewport/projection'
import { screenToBackdrop } from '../viewport/viewport'

import { TAG } from './consoleTag'

import type { CartographerStoreHook } from '../state/store'
import type { FrameEdgeSnap } from '../viewport/frameEdge'
import type { BackdropFrame } from '../viewport/projection'
import type { Point } from '../viewport/viewport'

/*
 * The map's edges and corners, for the gestures and the status bar (CARTO-257): where a free point lands, and
 * whether the pointer is within reach of an edge — one computation for both, so the bar never promises an edge
 * the click does not give.
 */

/** What the frame snap reads: the view, the backdrop's frame, and the reach in screen pixels. */
export interface FrameSnapContext {
  /** The store holding the viewport. */
  store: CartographerStoreHook
  /** The backdrop's frame. */
  frame: BackdropFrame
  /** The snapping radius, in screen pixels. */
  radius: number
}

/**
 * The map's edge or corner a free point would land on here, or `null`.
 * @param context - the store, the frame and the reach
 * @param at - the pointer, in screen pixels
 * @returns the snap, in backdrop pixels, or `null` when no edge is within reach
 */
function frameSnapAt(context: FrameSnapContext, at: Point): FrameEdgeSnap | null {
  const viewport = context.store.getState().viewport
  if (viewport.scale <= 0) return null
  const { size } = context.frame
  const snap = snapToFrameEdge(
    screenToBackdrop(viewport, at),
    size,
    context.radius / viewport.scale
  )
  const [x, y] = snap.point
  // A point far outside on the other axis is still off the map: not an edge it lands on.
  if (snap.snapped === null || x < 0 || y < 0 || x > size.width || y > size.height) return null
  return snap
}

/**
 * Where a point placed or dragged alone lands — on the map's edge or in its corner when within reach of them,
 * wherever the pointer is otherwise. Only for a point that would be free: the coast, the rivers and a
 * neighbour's anchors are looked for first, by the callers.
 * @param context - the store, the frame and the reach
 * @param at - the pointer, in screen pixels
 * @returns degrees, or `null` off the map
 */
export function freeLonLatAt(context: FrameSnapContext, at: Point): [number, number] | null {
  const snap = frameSnapAt(context, at)
  return snap === null
    ? screenToLonLatOnBackdrop(at, context.frame, context.store.getState().viewport)
    : backdropToLonLat(snap.point, context.frame)
}

/**
 * Whether a point would sit exactly on the outline's last one — what the frame clamp makes common, two
 * pointer positions within reach of a corner landing on the same spot (a zero-length edge).
 * @param last - the outline's last point, or `undefined` when it is empty
 * @param point - the point about to be placed
 * @returns `true` when the two coincide
 */
export function landsOnLast(
  last: readonly [number, number] | undefined,
  point: readonly [number, number]
): boolean {
  return last?.[0] === point[0] && last[1] === point[1]
}

/**
 * Refuse a click that would place a point on the outline's last one, saying so — the Pen's second click in a
 * corner it already ends on.
 * @param outline - the outline in progress
 * @param point - the point the click would place
 * @returns `true` when the click is refused
 */
export function repeatsLast(
  outline: readonly { at: readonly [number, number] }[],
  point: readonly [number, number]
): boolean {
  if (!landsOnLast(outline.at(-1)?.at, point)) return false
  console.warn(`${TAG} nothing placed: the outline already ends on that point.`)
  return true
}

/**
 * What the bar says of the frame under the pointer — `'edge'`, `'corner'`, or `null`, off the canvas too.
 * @param context - the store, the frame and the reach
 * @param pointer - the pointer, in screen pixels, or `null` off the canvas
 * @returns the edge the pointer is within reach of
 */
export function frameEdgeUnder(
  context: FrameSnapContext,
  pointer: Point | null
): 'edge' | 'corner' | null {
  return pointer === null ? null : (frameSnapAt(context, pointer)?.snapped ?? null)
}
