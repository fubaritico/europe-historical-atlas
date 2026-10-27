/**
 * The map's camera controls, as one handle: the drive at each frame (`mapControlsDrive`), the input listened to
 * (`mapControlsInput`), the flights and the focus (`cameraFlight`, `focusMode`), the framing (`cameraFraming`).
 */

import { clamp } from '@europe-historical-atlas/core/utils/math'

import { interrupt } from './cameraFlight'
import { clampTarget, footprintOffsets, placeCamera } from './cameraFraming'
import { createControlsState } from './controlsState'
import { clearFocus, enterFocus, isFocused, leaveFocus, leaveFocusTo } from './focusMode'
import { stepControls } from './mapControlsDrive'
import { bindListeners } from './mapControlsInput'

import type { ControlsState, MapControlsOptions, MapRect } from './controlsState'
import type { MapCameraState } from './mapCameraStore'
import type { CameraControls } from '../camera/cameraState'
import type { PerspectiveCamera, Vector3 } from 'three'

/**
 * A grand-strategy (EU4/Total War) map camera: pan the ground target with the arrow keys, zoom with the
 * wheel, yaw locked to north, no free orbit. Distance and pitch interpolate with the zoom, and the target
 * is clamped so the frustum's ground footprint stays within {@link MapControlsOptions.extent}. Implements
 * the {@link CameraControls} contract so it plugs into the same seams as any other controls.
 */
export interface MapControls extends CameraControls {
  /** Authoritative ground target (panned by the arrows, clamped so the view stays within the extent). */
  target: Vector3
  /** Desired zoom level in `[0, 1]` (0 = out, 1 = in). */
  zoom: number
  /** Live-tunable options — bind dev-panel sliders directly to these fields. */
  readonly options: MapControlsOptions
  /**
   * Replace the map extent (e.g. once the true map size is known, or when tuning it live).
   * @param extent - the new world rectangle the view must stay within
   */
  setExtent(extent: MapRect): void
  /**
   * The current map extent (for a debug overlay).
   * @returns a copy of the extent rectangle
   */
  getExtent(): MapRect
  /**
   * The frustum's current ground footprint as an absolute world rectangle (for a debug overlay). At the
   * rendered (smoothed) pose; collapses to the target point when the frustum overshoots the horizon.
   * @returns the footprint rectangle
   */
  getFootprint(): MapRect
  /**
   * Capture the current state for persistence.
   * @returns the serializable snapshot
   */
  getState(): MapCameraState
  /**
   * Restore a persisted state (snaps instantly, no easing — call before the first render).
   * @param state - the snapshot to apply
   */
  setState(state: MapCameraState): void
  /**
   * Advance the controls one frame.
   * @param delta - frame time in seconds (values ≤ 0 re-place the camera without integrating input)
   */
  update(delta?: number): void
  /**
   * Look closely at a point: fly there along an arc and settle at
   * {@link MapControlsOptions.flyFocusZoom}, remembering where to come back to.
   *
   * Any input from the reader cancels the flight but **not** the mode. A map that keeps flying while
   * someone is trying to steer has taken their camera away from them, which is worse than never having
   * moved it — but losing the way back for having looked around is a different and worse loss.
   * @param x - where to look, on X
   * @param z - the same on Z
   * @returns nothing
   */
  focusOn: (x: number, z: number) => void
  /**
   * Fly to a point at the zoom held before the focus was entered, and leave the focus.
   *
   * Outside the focus it is simply a re-centring at the current zoom.
   * @param x - where to look, on X
   * @param z - the same on Z
   * @returns nothing
   */
  panTo: (x: number, z: number) => void
  /**
   * Leave the focus and fly back to where the camera stood before it was entered.
   * @returns `true` if there was a focus to leave, `false` when the camera was already navigating
   */
  exitFocus: () => boolean
  /** Whether a flight is in progress. */
  readonly flying: boolean
  /** Whether the camera is looking closely at something rather than navigating. */
  readonly focused: boolean
  /**
   * Whether the pointer gesture that just ended was a drag rather than a click.
   *
   * The browser sends a `click` after any press-and-release on the same element, however far the
   * pointer travelled in between — so without this, every drag-pan would end in whatever a click does.
   * Owned here because this is where the drag lives; asking a second module to decide it again is how
   * two definitions of the same fact come to disagree.
   */
  readonly pointerDragged: boolean
  /** Remove all input listeners — call on teardown (no leak). */
  dispose(): void
}

/**
 * The half of the handle that reads and writes the camera's position.
 *
 * `zoom` is deliberately NOT here. It is an accessor, and object spread *evaluates* accessors: coming
 * through a `{ ...controlsView(state) }` it would flatten into a plain property frozen at whatever the
 * zoom happened to be, and the camera would never zoom again. The existing tests caught exactly that.
 * @param state - the controls' state
 * @returns that slice of the handle, accessors excluded
 */
function controlsView(
  state: ControlsState
): Omit<
  MapControls,
  | 'update'
  | 'dispose'
  | 'options'
  | 'target'
  | 'zoom'
  | 'focusOn'
  | 'panTo'
  | 'exitFocus'
  | 'flying'
  | 'focused'
  | 'pointerDragged'
> {
  return {
    setExtent(extent: MapRect): void {
      state.opts.extent = { ...extent } // cloned, so later caller mutations cannot bypass the API
      clampTarget(state)
    },
    getExtent(): MapRect {
      return { ...state.opts.extent }
    },
    getFootprint(): MapRect {
      const fp = footprintOffsets(state, state.zoom)
      const { x, z } = state.target
      if (!fp) return { minX: x, maxX: x, minZ: z, maxZ: z }
      return { minX: x + fp.dxMin, maxX: x + fp.dxMax, minZ: z + fp.dzMin, maxZ: z + fp.dzMax }
    },
    getState(): MapCameraState {
      return { target: [state.target.x, 0, state.target.z], zoom: state.zoom }
    },
    setState(restored: MapCameraState): void {
      // Snap the target and the zoom to the snapshot; the target stays on the ground plane.
      state.target.set(restored.target[0], 0, restored.target[2])
      state.zoom = clamp(restored.zoom, 0, 1)
      state.velX = state.velZ = state.velZoom = 0 // no residual inertia after a restore
      interrupt(state) // nor a flight left over from before the restore
      clearFocus(state) // nor a way back to a viewpoint the reader has just been taken away from
      // Keep the restored view within the extent, then put the camera at that pose.
      clampTarget(state)
      placeCamera(state)
    },
  }
}

/**
 * Create an EU4-style map camera controller bound to a camera and a DOM element (arrow-key pan + wheel
 * zoom, yaw locked north). The camera is placed immediately so the first frame is correct.
 * @param camera - the perspective camera to drive
 * @param domElement - the element receiving wheel events (usually the renderer canvas)
 * @param options - tunable behaviour
 * @param keyTarget - event target for keyboard input (default `window`; inject an isolated target in tests)
 * @returns the controls (call {@link MapControls.update} each frame, {@link MapControls.dispose} on teardown)
 */
export function createMapControls(
  camera: PerspectiveCamera,
  domElement: HTMLElement,
  options: MapControlsOptions,
  keyTarget: EventTarget = window
): MapControls {
  // Build the state every part shares, and start listening to the reader's input.
  const state = createControlsState(camera, domElement, options)
  const detach = bindListeners(state, keyTarget)

  // Clamp and place now, so the first frame is already framed correctly.
  clampTarget(state)
  placeCamera(state)

  // The handle: the plain methods first, then the accessors and calls that need the live state.
  return {
    ...controlsView(state),
    target: state.target,
    options: state.opts,
    // Defined here rather than in `controlsView`: an accessor cannot survive an object spread.
    get zoom(): number {
      return state.zoom
    },
    set zoom(v: number) {
      state.zoom = clamp(v, 0, 1)
    },
    update(delta = 0): void {
      stepControls(state, delta)
    },
    focusOn(x: number, z: number): void {
      enterFocus(state, x, z)
    },
    panTo(x: number, z: number): void {
      leaveFocusTo(state, x, z)
    },
    exitFocus(): boolean {
      return leaveFocus(state)
    },
    // Defined here rather than in `controlsView`: an accessor cannot survive an object spread.
    get flying(): boolean {
      return state.flight !== null
    },
    // Likewise.
    get focused(): boolean {
      return isFocused(state)
    },
    // Likewise.
    get pointerDragged(): boolean {
      return state.pointerDragged
    },
    dispose: detach,
  }
}
