/**
 * Looking closely at a place, as a state the camera is in rather than a move it makes.
 *
 * Entering it remembers where the reader was. Everything that leaves it is therefore a *return*, and the
 * two ways out differ only in where they land:
 *
 * - **Escape** goes back to the remembered position entirely — the mode is undone;
 * - **a single click** keeps the place that was pointed at but gives up the close-up, landing on the
 *   clicked point at the zoom held before the mode was entered.
 *
 * Its own module rather than three more branches inside the controls: which gesture costs the reader
 * their way back is a rule about the map, and rules that live inside a handler are the ones no test can
 * reach without a DOM.
 */

import { arcPeak, beginFlight, restPoint } from './cameraFlight'

import type { ControlsState } from './controlsState'

/**
 * Whether the camera is looking closely at something rather than navigating.
 * @param state - the controls' state
 * @returns `true` while there is somewhere to come back to
 */
export function isFocused(state: ControlsState): boolean {
  return state.focusReturn !== null
}

/**
 * Forget the focus without moving the camera.
 *
 * What a restore needs, and the only exit that is not a return: the remembered position belongs to a
 * viewpoint the reader has just been taken away from, so flying back to it would undo the restore.
 * @param state - the controls' state
 * @returns nothing
 */
export function clearFocus(state: ControlsState): void {
  state.focusReturn = null
}

/**
 * Look closely at a point, remembering where to come back to.
 *
 * The return is captured **once**: while focused, jumping from one target to the next must not move it,
 * or the way out would creep along behind the reader and Escape would stop meaning anything.
 * @param state - the controls' state
 * @param x - where to look, on X
 * @param z - the same on Z
 * @returns nothing
 */
export function enterFocus(state: ControlsState, x: number, z: number): void {
  state.focusReturn ??= restPoint(state)
  const settled = state.opts.flyFocusZoom
  // The one flight that arcs. Focus to focus runs from maximum zoom to maximum zoom, so a straight
  // interpolation would slide across the map at ground level with nothing legible in between.
  beginFlight(state, x, z, settled, arcPeak(state, settled))
}

/**
 * Leave the focus, landing on a point at the zoom held before it was entered.
 *
 * Outside the mode there is nothing to restore, so the current zoom is the zoom to keep and this is
 * simply a re-centring. Both branches are ordinary states of the camera — neither stands in for a value
 * that failed to arrive.
 *
 * Flies straight: leaving a focus pulls out on its own, from the close-up back to wherever the reader
 * was, and arcing on top of that would carry the camera past its destination and back.
 * @param state - the controls' state
 * @param x - where to look, on X
 * @param z - the same on Z
 * @returns nothing
 */
export function leaveFocusTo(state: ControlsState, x: number, z: number): void {
  const zoom = state.focusReturn?.zoom ?? state.zoom
  state.focusReturn = null
  beginFlight(state, x, z, zoom)
}

/**
 * Leave the focus and fly back to where the camera stood before it was entered.
 *
 * Flies straight, for the same reason as {@link leaveFocusTo}: the pull-out is the trip itself.
 * @param state - the controls' state
 * @returns `true` if there was a focus to leave, `false` when the camera was already navigating
 */
export function leaveFocus(state: ControlsState): boolean {
  const back = state.focusReturn
  if (!back) return false
  state.focusReturn = null
  beginFlight(state, back.x, back.z, back.zoom)
  return true
}
