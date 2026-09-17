import { clamp } from '../utils/math'

import { advanceFlight, beginFlight, interrupt } from './cameraFlight'
import { clampTarget, footprintOffsets, placeCamera } from './cameraFraming'
import {
  createControlsState,
  degToRad,
  distanceForZoom,
  viewportHeight,
  viewportWidth,
} from './controlsState'

// The options and the rectangle they clamp within live with the state every part of this reads, and
// are re-exported here so no call site had to move.
export type { MapControlsOptions, MapRect } from './controlsState'

import type { ControlsState, MapControlsOptions, MapRect } from './controlsState'
import type { MapCameraState } from './mapCameraStore'
import type { CameraControls } from '../camera/cameraState'
import type { PerspectiveCamera, Vector3 } from 'three'

/** Keys that pan the map (arrow keys). Held keys accumulate a continuous pan. */
const PAN_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

/** Keys that zoom in (keyboard equivalent of wheel-up). */
const ZOOM_IN_KEYS = new Set(['+', '=', 'PageUp'])
/** Keys that zoom out (keyboard equivalent of wheel-down). */
const ZOOM_OUT_KEYS = new Set(['-', '_', 'PageDown'])

/** Form-control tags whose own arrow-key handling must not be hijacked by the map pan. */
const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Whether the focused element is an editable/form control (so arrow keys should reach it, not pan the map).
 * @returns `true` when a text field, select, or contenteditable element currently has focus
 */
function isEditableFocused(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.activeElement
  return el instanceof HTMLElement && (el.isContentEditable || EDITABLE_TAGS.has(el.tagName))
}

/**
 * Frame-rate-independent ease-out decay factor: multiply a velocity by this each frame to glide it toward
 * zero over roughly `tau` seconds (fast at first, ever slower). Shared by every inertial movement.
 * @param dt - frame delta in seconds
 * @param tau - decay time constant in seconds
 * @returns the per-frame multiplier in `[0, 1]`
 */
export function easeOutDecay(dt: number, tau: number): number {
  return Math.exp(-dt / tau)
}

/**
 * One inertial velocity step: snap to the input speed while it is non-zero (fast start), otherwise glide
 * and decelerate toward zero (ease-out).
 * @param velocity - the current velocity
 * @param drive - the input speed this frame (0 = no input)
 * @param decay - the per-frame decay factor from {@link easeOutDecay}
 * @returns the next velocity
 */
export function driveOrGlide(velocity: number, drive: number, decay: number): number {
  return drive !== 0 ? drive : velocity * decay
}

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
   * Fly the camera to a point on the ground, easing in and out and settling closer than it started.
   *
   * Any input from the reader cancels it. A map that keeps flying while someone is trying to steer has
   * taken their camera away from them, which is worse than never having moved it.
   * @param x - where to look, on X
   * @param z - the same on Z
   * @returns nothing
   */
  flyTo: (x: number, z: number) => void
  /** Whether a flight is in progress. */
  readonly flying: boolean
  /** Remove all input listeners — call on teardown (no leak). */
  dispose(): void
}

/**
 * A wheel notch's or key press's worth of zoom-velocity impulse, which then eases out.
 * @param opts - the tuning
 * @param direction - `1` to zoom in, `-1` to zoom out
 * @returns the impulse
 */
function zoomImpulse(opts: MapControlsOptions, direction: number): number {
  return (direction * opts.zoomSpeed) / opts.smoothingTau
}

/**
 * The drive velocity the held pan keys ask for.
 * @param pressed - which keys are held
 * @param pan - the pan speed at this zoom
 * @returns the drive on X and Z
 */
export function keyboardDrive(pressed: ReadonlySet<string>, pan: number): { x: number; z: number } {
  let x = 0
  let z = 0
  if (pressed.has('ArrowUp')) z -= pan // north
  if (pressed.has('ArrowDown')) z += pan
  if (pressed.has('ArrowLeft')) x -= pan
  if (pressed.has('ArrowRight')) x += pan
  return { x, z }
}

/**
 * The drive velocity the pointer's nearness to an edge asks for.
 *
 * Nothing at all while the pointer is outside the viewport: a cursor that has left the window is not
 * asking for anything, and without this the map would scroll on forever after the pointer leaves.
 * @param pointerX - the pointer's X in CSS pixels
 * @param pointerY - its Y
 * @param vw - the viewport width
 * @param vh - the viewport height
 * @param margin - how close to an edge the scrolling starts
 * @param edge - the edge-scroll speed at this zoom
 * @returns the drive on X and Z
 */
export function edgeScrollDrive(
  pointerX: number,
  pointerY: number,
  vw: number,
  vh: number,
  margin: number,
  edge: number
): { x: number; z: number } {
  if (pointerX < 0 || pointerX > vw || pointerY < 0 || pointerY > vh) return { x: 0, z: 0 }
  let x = 0
  let z = 0
  if (pointerX < margin) x -= edge
  else if (pointerX > vw - margin) x += edge
  if (pointerY < margin) z -= edge
  else if (pointerY > vh - margin) z += edge
  return { x, z }
}

/**
 * Ease the pan velocity toward what the input asks for, and move the target by it.
 *
 * Ease-OUT: it snaps to full speed on input and glides to a stop on release, which is what makes the
 * map feel driven rather than dragged through treacle.
 * @param state - the controls' state
 * @param distance - the camera-to-target distance, which scales the apparent speed
 * @param delta - the frame time in seconds
 * @returns nothing
 */
function driveTarget(state: ControlsState, distance: number, delta: number): void {
  const { opts } = state
  const pan = opts.panSpeed * (distance / opts.maxDistance)
  const keys = keyboardDrive(state.pressed, pan)
  const edge =
    opts.enableEdgeScroll && !Number.isNaN(state.pointerX)
      ? edgeScrollDrive(
          state.pointerX,
          state.pointerY,
          viewportWidth(state),
          viewportHeight(state),
          opts.edgeScrollMargin,
          opts.edgeScrollSpeed * (distance / opts.maxDistance)
        )
      : { x: 0, z: 0 }
  const decay = easeOutDecay(delta, opts.smoothingTau)
  state.velX = driveOrGlide(state.velX, keys.x + edge.x, decay)
  state.velZ = driveOrGlide(state.velZ, keys.z + edge.z, decay)
  state.target.x += state.velX * delta
  state.target.z += state.velZ * delta
}

/**
 * Move the target by whatever the reader is asking for this frame.
 * @param state - the controls' state
 * @param delta - the frame time in seconds
 * @returns nothing
 */
function driveFrame(state: ControlsState, delta: number): void {
  // Distance scales pan and edge speed, so the map moves the same apparent amount at every zoom.
  const distance = distanceForZoom(state.opts, state.zoom)
  if (state.dragging) {
    // A drag moves the target directly (grab-the-map); its velocity becomes release momentum.
    state.velX = state.dragMovedX / delta
    state.velZ = state.dragMovedZ / delta
    state.dragMovedX = 0
    state.dragMovedZ = 0
  } else {
    driveTarget(state, distance, delta)
  }
  // Zoom inertia: the wheel injects velocity, which eases out; integrate then clamp.
  state.velZoom *= easeOutDecay(delta, state.opts.smoothingTau)
  state.zoom = clamp(state.zoom + state.velZoom * delta, 0, 1)
}

/**
 * Advance the camera by one frame.
 * @param state - the controls' state
 * @param delta - the frame time in seconds
 * @returns nothing
 */
function stepControls(state: ControlsState, delta: number): void {
  if (delta > 0) {
    const flight = state.flight
    if (flight) advanceFlight(state, flight, delta)
    else driveFrame(state, delta)
  }
  clampTarget(state)
  placeCamera(state)
}

/**
 * The keyboard listeners: pan keys, and the keyboard equivalent of the wheel.
 * @param state - the controls' state
 * @returns the listeners, by event name
 */
function createKeyListeners(state: ControlsState): {
  keydown: (e: Event) => void
  keyup: (e: Event) => void
} {
  return {
    keydown: (e: Event): void => {
      const ke = e as KeyboardEvent
      if (isEditableFocused()) return // don't hijack keys while a form field (e.g. lil-gui) has focus
      if (PAN_KEYS.has(ke.key) || ZOOM_IN_KEYS.has(ke.key) || ZOOM_OUT_KEYS.has(ke.key)) {
        interrupt(state)
      }
      if (PAN_KEYS.has(ke.key)) {
        state.pressed.add(ke.key)
        ke.preventDefault() // stop the page from scrolling on arrow keys
      } else if (ZOOM_IN_KEYS.has(ke.key)) {
        state.velZoom += zoomImpulse(state.opts, 1) // keyboard equivalent of wheel-up (WCAG 2.1.1)
        ke.preventDefault()
      } else if (ZOOM_OUT_KEYS.has(ke.key)) {
        state.velZoom += zoomImpulse(state.opts, -1)
        ke.preventDefault()
      }
    },
    keyup: (e: Event): void => {
      state.pressed.delete((e as KeyboardEvent).key)
    },
  }
}

/**
 * The wheel and pointer listeners: zoom, and grab-the-map dragging.
 * @param state - the controls' state
 * @returns the listeners, by event name
 */
function createPointerListeners(state: ControlsState): {
  wheel: (e: Event) => void
  pointerdown: (e: Event) => void
  pointermove: (e: Event) => void
  pointerup: () => void
} {
  return {
    wheel: (e: Event): void => {
      const we = e as WheelEvent
      if (we.ctrlKey) return // let the browser's ctrl+wheel page zoom through (WCAG 1.4.4)
      interrupt(state)
      we.preventDefault() // stop the page from scrolling on wheel
      state.velZoom += zoomImpulse(state.opts, -Math.sign(we.deltaY)) // wheel up = zoom in
    },
    pointerdown: (e: Event): void => {
      const pe = e as PointerEvent
      if (!state.opts.enableDrag || pe.button !== 0) return
      interrupt(state)
      state.dragging = true
      state.lastX = pe.clientX
      state.lastY = pe.clientY
    },
    pointermove: (e: Event): void => {
      const pe = e as PointerEvent
      state.pointerX = pe.clientX
      state.pointerY = pe.clientY
      if (!state.dragging) return
      // Grab-the-map: the ground follows the cursor, so the target moves opposite to the drag. The
      // amount moved is accumulated too, so a frame can turn it into release momentum.
      const distance = distanceForZoom(state.opts, state.zoom)
      const worldPerPixel =
        (2 * distance * Math.tan(degToRad(state.camera.fov) / 2)) / viewportHeight(state)
      const dx = -(pe.clientX - state.lastX) * worldPerPixel
      const dz = -(pe.clientY - state.lastY) * worldPerPixel
      state.target.x += dx
      state.target.z += dz
      state.dragMovedX += dx
      state.dragMovedZ += dz
      state.lastX = pe.clientX
      state.lastY = pe.clientY
    },
    pointerup: (): void => {
      state.dragging = false
    },
  }
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
): Omit<MapControls, 'update' | 'dispose' | 'options' | 'target' | 'zoom' | 'flyTo' | 'flying'> {
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
      state.target.set(restored.target[0], 0, restored.target[2])
      state.zoom = clamp(restored.zoom, 0, 1)
      state.velX = state.velZ = state.velZoom = 0 // no residual inertia after a restore
      interrupt(state) // nor a flight left over from before the restore
      clampTarget(state)
      placeCamera(state)
    },
  }
}

/**
 * Attach every input listener, and hand back the one call that removes them all.
 *
 * Paired here rather than spelled out twice: six `addEventListener` calls answered by six
 * `removeEventListener` calls, kept in step by hand, is a listener leak waiting for someone to add a
 * seventh — and the map binds keys on `window`, so a leaked one outlives the canvas.
 * @param state - the controls' state
 * @param keyTarget - where keyboard input is read from
 * @returns a call that detaches everything
 */
function bindListeners(state: ControlsState, keyTarget: EventTarget): () => void {
  const keys = createKeyListeners(state)
  const pointer = createPointerListeners(state)
  const { domElement } = state
  keyTarget.addEventListener('keydown', keys.keydown)
  keyTarget.addEventListener('keyup', keys.keyup)
  domElement.addEventListener('wheel', pointer.wheel, { passive: false })
  domElement.addEventListener('pointerdown', pointer.pointerdown)
  window.addEventListener('pointermove', pointer.pointermove)
  window.addEventListener('pointerup', pointer.pointerup)
  return (): void => {
    keyTarget.removeEventListener('keydown', keys.keydown)
    keyTarget.removeEventListener('keyup', keys.keyup)
    domElement.removeEventListener('wheel', pointer.wheel)
    domElement.removeEventListener('pointerdown', pointer.pointerdown)
    window.removeEventListener('pointermove', pointer.pointermove)
    window.removeEventListener('pointerup', pointer.pointerup)
    state.pressed.clear()
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
  const state = createControlsState(camera, domElement, options)
  const detach = bindListeners(state, keyTarget)

  clampTarget(state)
  placeCamera(state)

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
    flyTo(x: number, z: number): void {
      beginFlight(state, x, z)
    },
    // Defined here rather than in `controlsView`: an accessor cannot survive an object spread.
    get flying(): boolean {
      return state.flight !== null
    },
    dispose: detach,
  }
}
