import { Vector3 } from 'three'

import type { MapCameraState } from './mapCameraStore'
import type { CameraControls } from '../camera/cameraState'
import type { PerspectiveCamera } from 'three'

/** Keys that pan the map (arrow keys). Held keys accumulate a continuous pan. */
const PAN_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

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
 * Ground-plane pan limits for the camera target (world XZ), already inset from the true map edge so the
 * void beyond the finite plane never shows.
 */
export interface MapControlsBounds {
  /** Minimum target X (west). */
  minX: number
  /** Maximum target X (east). */
  maxX: number
  /** Minimum target Z (north, since north faces −Z). */
  minZ: number
  /** Maximum target Z (south). */
  maxZ: number
}

/**
 * Live-tunable options for {@link createMapControls}. Distance and pitch interpolate with the zoom level
 * (`0` = fully zoomed out / top-down-ish and far, `1` = fully zoomed in / oblique and close).
 */
export interface MapControlsOptions {
  /** Pan limits for the target (world XZ), inset from the map edge. */
  bounds: MapControlsBounds
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
}

/**
 * A grand-strategy (EU4/Total War) map camera: pan the ground target with the arrow keys, zoom with the
 * wheel, yaw locked to north, no free orbit. Distance and pitch interpolate with the zoom. Implements the
 * {@link CameraControls} contract so it plugs into the same seams as any other controls.
 */
export interface MapControls extends CameraControls {
  /** Authoritative ground target (panned by the arrows, clamped to {@link MapControlsOptions.bounds}). */
  target: Vector3
  /** Desired zoom level in `[0, 1]` (0 = out, 1 = in). */
  zoom: number
  /** Live-tunable options — bind dev-panel sliders directly to these fields. */
  readonly options: MapControlsOptions
  /**
   * Replace the pan bounds (e.g. once the true map extent is known after the DEM loads).
   * @param bounds - the new pan limits
   */
  setBounds(bounds: MapControlsBounds): void
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
   * @param delta - frame time in seconds (0 = re-place the camera without integrating input)
   */
  update(delta?: number): void
  /** Remove all input listeners — call on teardown (no leak). */
  dispose(): void
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
  const opts = options
  const target = new Vector3(
    (opts.bounds.minX + opts.bounds.maxX) / 2,
    0,
    (opts.bounds.minZ + opts.bounds.maxZ) / 2
  )
  const smoothTarget = target.clone()
  let zoom = clamp(opts.initialZoom, 0, 1)
  let smoothZoom = zoom

  const pressed = new Set<string>()

  const clampTarget = (): void => {
    target.x = clamp(target.x, opts.bounds.minX, opts.bounds.maxX)
    target.z = clamp(target.z, opts.bounds.minZ, opts.bounds.maxZ)
    target.y = 0
  }

  const placeCamera = (): void => {
    const distance = lerp(opts.maxDistance, opts.minDistance, smoothZoom)
    const pitch = degToRad(lerp(opts.maxPitchDeg, opts.minPitchDeg, smoothZoom))
    // Yaw locked north (north faces −Z): the camera sits south of and above the target, looking north-down.
    camera.position.set(
      smoothTarget.x,
      smoothTarget.y + distance * Math.sin(pitch),
      smoothTarget.z + distance * Math.cos(pitch)
    )
    camera.lookAt(smoothTarget)
  }

  const onKeyDown = (e: Event): void => {
    const ke = e as KeyboardEvent
    if (!PAN_KEYS.has(ke.key)) return
    if (isEditableFocused()) return // don't hijack arrow keys while a form field (e.g. lil-gui) has focus
    pressed.add(ke.key)
    ke.preventDefault() // stop the page from scrolling on arrow keys
  }
  const onKeyUp = (e: Event): void => {
    pressed.delete((e as KeyboardEvent).key)
  }
  const onWheel = (e: Event): void => {
    const we = e as WheelEvent
    we.preventDefault() // stop the page from scrolling on wheel
    zoom = clamp(zoom - Math.sign(we.deltaY) * opts.zoomSpeed, 0, 1) // wheel up (deltaY < 0) → zoom in
  }

  keyTarget.addEventListener('keydown', onKeyDown)
  keyTarget.addEventListener('keyup', onKeyUp)
  domElement.addEventListener('wheel', onWheel, { passive: false })

  placeCamera()

  return {
    target,
    get zoom(): number {
      return zoom
    },
    set zoom(v: number) {
      zoom = clamp(v, 0, 1)
    },
    options: opts,
    setBounds(bounds: MapControlsBounds): void {
      opts.bounds = bounds
      clampTarget()
    },
    getState(): MapCameraState {
      return { target: [target.x, 0, target.z], zoom }
    },
    setState(state: MapCameraState): void {
      target.set(state.target[0], 0, state.target[2])
      clampTarget()
      zoom = clamp(state.zoom, 0, 1)
      smoothZoom = zoom
      smoothTarget.copy(target)
      placeCamera()
    },
    update(delta = 0): void {
      if (delta > 0 && pressed.size > 0) {
        // Pan speed scales with distance so the map moves the same apparent amount at every zoom.
        const distance = lerp(opts.maxDistance, opts.minDistance, smoothZoom)
        const step = opts.panSpeed * delta * (distance / opts.maxDistance)
        if (pressed.has('ArrowUp')) target.z -= step // north
        if (pressed.has('ArrowDown')) target.z += step
        if (pressed.has('ArrowLeft')) target.x -= step
        if (pressed.has('ArrowRight')) target.x += step
        clampTarget()
      }
      // Frame-rate-independent exponential smoothing toward the desired target/zoom.
      const k = delta > 0 ? 1 - Math.exp(-delta / opts.smoothingTau) : 1
      smoothTarget.lerp(target, k)
      smoothZoom = lerp(smoothZoom, zoom, k)
      placeCamera()
    },
    dispose(): void {
      keyTarget.removeEventListener('keydown', onKeyDown)
      keyTarget.removeEventListener('keyup', onKeyUp)
      domElement.removeEventListener('wheel', onWheel)
      pressed.clear()
    },
  }
}
