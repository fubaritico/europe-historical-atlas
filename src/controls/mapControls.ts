import { Vector3 } from 'three'

import type { MapCameraState } from './mapCameraStore'
import type { CameraControls } from '../camera/cameraState'
import type { PerspectiveCamera } from 'three'

/** Keys that pan the map (arrow keys). Held keys accumulate a continuous pan. */
const PAN_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

/** Keys that zoom in (keyboard equivalent of wheel-up). */
const ZOOM_IN_KEYS = new Set(['+', '=', 'PageUp'])
/** Keys that zoom out (keyboard equivalent of wheel-down). */
const ZOOM_OUT_KEYS = new Set(['-', '_', 'PageDown'])

/** Form-control tags whose own arrow-key handling must not be hijacked by the map pan. */
const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** World up axis (+Y), shared by the footprint math (read-only). */
const WORLD_UP = new Vector3(0, 1, 0)

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
 * Clamp a number to `[lo, hi]`.
 * @param v - value
 * @param lo - lower bound
 * @param hi - upper bound
 * @returns the clamped value
 */
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/**
 * Linear interpolation.
 * @param a - value at `t = 0`
 * @param b - value at `t = 1`
 * @param t - interpolation factor
 * @returns the interpolated value
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Degrees → radians.
 * @param deg - angle in degrees
 * @returns angle in radians
 */
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
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
 * An axis-aligned rectangle in the world ground plane (XZ). Used both for the map `extent` (the region the
 * camera view must stay within) and for reporting the frustum's ground footprint.
 */
export interface MapRect {
  /** Minimum X (west). */
  minX: number
  /** Maximum X (east). */
  maxX: number
  /** Minimum Z (north, since north faces −Z). */
  minZ: number
  /** Maximum Z (south). */
  maxZ: number
}

/**
 * Live-tunable options for {@link createMapControls}. Distance and pitch interpolate with the zoom level
 * (`0` = fully zoomed out / top-down-ish and far, `1` = fully zoomed in / oblique and close).
 */
export interface MapControlsOptions {
  /**
   * The world rectangle the camera's ground **view** must stay within (invariant to zoom and window
   * aspect). The pannable target range is derived from this minus the current frustum footprint, so it
   * grows as you zoom in and shrinks as you zoom out — and adapts on window resize.
   */
  extent: MapRect
  /** Camera→target distance at full zoom-in (`zoom = 1`). */
  minDistance: number
  /** Camera→target distance at full zoom-out (`zoom = 0`). */
  maxDistance: number
  /** Pitch above the ground plane (degrees) at full zoom-in — smaller = more oblique (EU4 feel). */
  minPitchDeg: number
  /** Pitch above the ground plane (degrees) at full zoom-out — larger = more top-down. */
  maxPitchDeg: number
  /** Pan speed (world units/second) at full zoom-out; scaled down as the camera gets closer. */
  panSpeed: number
  /** Zoom change per wheel notch, in normalized zoom units. */
  zoomSpeed: number
  /** Exponential smoothing time constant (seconds); lower = snappier, higher = more inertia. */
  smoothingTau: number
  /** Initial zoom level in `[0, 1]`. */
  initialZoom: number
  /** Enable grab-and-drag panning with the pointer (hold and drag the map). */
  enableDrag: boolean
  /** Enable RTS-style edge scrolling (pan when the pointer nears a screen edge). */
  enableEdgeScroll: boolean
  /** Edge-scroll trigger margin in pixels from each screen edge. */
  edgeScrollMargin: number
  /** Edge-scroll speed (world units/second at full zoom-out; scaled down as the camera gets closer). */
  edgeScrollSpeed: number
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
  /** Remove all input listeners — call on teardown (no leak). */
  dispose(): void
}

/** Everything the controls hold and mutate, passed explicitly rather than captured in a closure. */
interface ControlsState {
  /** The camera being driven. */
  camera: PerspectiveCamera
  /** The element wheel and pointer events are read from, and whose size the viewport follows. */
  domElement: HTMLElement
  /** Tuned live by the dev panel, so read on every use rather than destructured once. */
  opts: MapControlsOptions
  /** What the camera looks at, on the ground plane. */
  target: Vector3
  /** Zoom in `[0, 1]`, zoomed out at zero. */
  zoom: number
  /** Pan inertia on X, in world units per second. */
  velX: number
  /** Pan inertia on Z. */
  velZ: number
  /** Zoom inertia, per second. */
  velZoom: number
  /** World movement applied by an in-progress drag this frame, turned into release momentum. */
  dragMovedX: number
  /** The same on Z. */
  dragMovedZ: number
  /** Which pan keys are held. */
  pressed: Set<string>
  /** Whether the map is being dragged. */
  dragging: boolean
  /** Last pointer position during a drag. */
  lastX: number
  /** The same on Y. */
  lastY: number
  /** Live pointer position, `NaN` until the pointer has moved once. */
  pointerX: number
  /** The same on Y. */
  pointerY: number
  /** Reused vectors for the footprint maths — this runs every frame and must not allocate. */
  scratch: { f: Vector3; r: Vector3; u: Vector3; dir: Vector3 }
}

/**
 * Viewport width, falling back to the window where the element has not been laid out yet.
 * @param state - the controls' state
 * @returns the width in CSS pixels
 */
function viewportWidth(state: ControlsState): number {
  return state.domElement.clientWidth || window.innerWidth
}

/**
 * Viewport height, same fallback.
 * @param state - the controls' state
 * @returns the height in CSS pixels
 */
function viewportHeight(state: ControlsState): number {
  return state.domElement.clientHeight || window.innerHeight
}

/**
 * Camera-to-target distance for a zoom level — the single source of truth for that curve.
 * @param opts - the tuning
 * @param z - zoom in `[0, 1]`
 * @returns the distance in world units
 */
function distanceForZoom(opts: MapControlsOptions, z: number): number {
  return lerp(opts.maxDistance, opts.minDistance, z)
}

/**
 * Camera pitch for a zoom level — likewise.
 * @param opts - the tuning
 * @param z - zoom in `[0, 1]`
 * @returns the pitch in radians
 */
function pitchForZoom(opts: MapControlsOptions, z: number): number {
  return degToRad(lerp(opts.maxPitchDeg, opts.minPitchDeg, z))
}

/**
 * Ground footprint of the frustum at a given zoom, as an AABB **offset from the target**.
 *
 * Yaw is locked, so the shape is translation-invariant in XZ and can be computed once per zoom rather
 * than per position. The four frustum corners are raycast onto `y = 0` using the live fov and aspect,
 * which is what makes the pannable range follow a resize without anyone having to recompute it.
 * @param state - the controls' state
 * @param z - zoom in `[0, 1]`
 * @returns the offsets, or `null` when a corner overshoots the horizon and the footprint is unbounded
 */
function footprintOffsets(
  state: ControlsState,
  z: number
): { dxMin: number; dxMax: number; dzMin: number; dzMax: number } | null {
  const { camera, scratch } = state
  const distance = distanceForZoom(state.opts, z)
  const pitch = pitchForZoom(state.opts, z)
  const camY = distance * Math.sin(pitch)
  const camZ = distance * Math.cos(pitch) // camera sits at (0, camY, camZ) relative to the target
  scratch.f.set(0, -camY, -camZ).normalize() // forward: from camera toward the target (origin)
  scratch.r.crossVectors(scratch.f, WORLD_UP).normalize() // right (east)
  scratch.u.crossVectors(scratch.r, scratch.f).normalize() // camera up
  const halfH = Math.tan(degToRad(camera.fov) / 2)
  const halfW = halfH * camera.aspect
  let dxMin = Infinity
  let dxMax = -Infinity
  let dzMin = Infinity
  let dzMax = -Infinity
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      scratch.dir
        .copy(scratch.f)
        .addScaledVector(scratch.r, sx * halfW)
        .addScaledVector(scratch.u, sy * halfH)
        .normalize()
      if (scratch.dir.y > -1e-3) return null // the ray misses the ground → the footprint is unbounded
      const t = -camY / scratch.dir.y
      const hx = t * scratch.dir.x // camera x is 0 relative to the target
      const hz = camZ + t * scratch.dir.z
      dxMin = Math.min(dxMin, hx)
      dxMax = Math.max(dxMax, hx)
      dzMin = Math.min(dzMin, hz)
      dzMax = Math.max(dzMax, hz)
    }
  }
  return { dxMin, dxMax, dzMin, dzMax }
}

/**
 * Clamp the target so the frustum footprint stays within the extent.
 *
 * Bounding the *footprint* rather than the target is what makes the pannable area grow as you zoom in
 * and re-centre as you pull out. Where the footprint is wider than the extent on an axis, or unbounded,
 * the target locks to the extent's centre — there is no position that satisfies the constraint.
 * @param state - the controls' state
 * @returns nothing
 */
function clampTarget(state: ControlsState): void {
  const ext = state.opts.extent
  const cx = (ext.minX + ext.maxX) / 2
  const cz = (ext.minZ + ext.maxZ) / 2
  const fp = footprintOffsets(state, state.zoom)
  let minX = cx
  let maxX = cx
  let minZ = cz
  let maxZ = cz
  if (fp) {
    minX = ext.minX - fp.dxMin
    maxX = ext.maxX - fp.dxMax
    minZ = ext.minZ - fp.dzMin
    maxZ = ext.maxZ - fp.dzMax
    if (minX > maxX) minX = maxX = cx
    if (minZ > maxZ) minZ = maxZ = cz
  }
  state.target.x = clamp(state.target.x, minX, maxX)
  state.target.z = clamp(state.target.z, minZ, maxZ)
  state.target.y = 0
}

/**
 * Put the camera where the current target and zoom say it belongs.
 *
 * Yaw locked north (north faces −Z): the camera sits south of and above the target, looking north-down.
 * @param state - the controls' state
 * @returns nothing
 */
function placeCamera(state: ControlsState): void {
  const distance = distanceForZoom(state.opts, state.zoom)
  const pitch = pitchForZoom(state.opts, state.zoom)
  state.camera.position.set(
    state.target.x,
    state.target.y + distance * Math.sin(pitch),
    state.target.z + distance * Math.cos(pitch)
  )
  state.camera.lookAt(state.target)
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
 * Advance the camera by one frame.
 * @param state - the controls' state
 * @param delta - the frame time in seconds
 * @returns nothing
 */
function stepControls(state: ControlsState, delta: number): void {
  if (delta > 0) {
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
      we.preventDefault() // stop the page from scrolling on wheel
      state.velZoom += zoomImpulse(state.opts, -Math.sign(we.deltaY)) // wheel up = zoom in
    },
    pointerdown: (e: Event): void => {
      const pe = e as PointerEvent
      if (!state.opts.enableDrag || pe.button !== 0) return
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
): Omit<MapControls, 'update' | 'dispose' | 'options' | 'target' | 'zoom'> {
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
      clampTarget(state)
      placeCamera(state)
    },
  }
}

/**
 * The controls' state, at rest.
 * @param camera - the camera to drive
 * @param domElement - the element events are read from
 * @param options - the tuning, held by reference because the dev panel mutates it in place
 * @returns the state
 */
function createControlsState(
  camera: PerspectiveCamera,
  domElement: HTMLElement,
  options: MapControlsOptions
): ControlsState {
  return {
    camera,
    domElement,
    opts: options,
    target: new Vector3(
      (options.extent.minX + options.extent.maxX) / 2,
      0,
      (options.extent.minZ + options.extent.maxZ) / 2
    ),
    zoom: clamp(options.initialZoom, 0, 1),
    velX: 0,
    velZ: 0,
    velZoom: 0,
    dragMovedX: 0,
    dragMovedZ: 0,
    pressed: new Set<string>(),
    dragging: false,
    lastX: 0,
    lastY: 0,
    // NaN until the pointer has moved once, so edge-scroll cannot fire before it is anywhere.
    pointerX: Number.NaN,
    pointerY: Number.NaN,
    scratch: { f: new Vector3(), r: new Vector3(), u: new Vector3(), dir: new Vector3() },
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
    dispose: detach,
  }
}
