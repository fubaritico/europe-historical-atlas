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
    (opts.extent.minX + opts.extent.maxX) / 2,
    0,
    (opts.extent.minZ + opts.extent.maxZ) / 2
  )
  let zoom = clamp(opts.initialZoom, 0, 1)
  // Inertia velocities (decay to zero for an ease-out glide): target pan (world units/s) and zoom (per-s).
  let velX = 0
  let velZ = 0
  let velZoom = 0
  // World movement applied by an in-progress drag this frame (consumed by update to capture its velocity).
  let dragMovedX = 0
  let dragMovedZ = 0

  const pressed = new Set<string>()
  // Reused scratch vectors for the per-frame footprint math (no per-frame allocation).
  const f = new Vector3()
  const r = new Vector3()
  const u = new Vector3()
  const dir = new Vector3()

  // Pointer state for drag-pan and edge-scroll (assumes a full-window canvas, so client coords == viewport).
  let dragging = false
  let lastX = 0
  let lastY = 0
  let pointerX = Number.NaN
  let pointerY = Number.NaN
  const viewportWidth = (): number => domElement.clientWidth || window.innerWidth
  const viewportHeight = (): number => domElement.clientHeight || window.innerHeight

  /** Camera→target distance for a zoom level (single source of truth for the zoom→distance curve). */
  const distanceForZoom = (z: number): number => lerp(opts.maxDistance, opts.minDistance, z)
  /** Camera pitch (radians) for a zoom level (single source of truth for the zoom→pitch curve). */
  const pitchForZoom = (z: number): number => degToRad(lerp(opts.maxPitchDeg, opts.minPitchDeg, z))

  /**
   * Ground footprint of the frustum at a given zoom, as an AABB **offset from the target** (yaw is locked,
   * so the shape is translation-invariant in XZ). Raycasts the 4 frustum corners onto the `y = 0` plane
   * using the live camera fov + aspect. Returns `null` when a corner overshoots the horizon (unbounded).
   * @param z - zoom level in `[0, 1]`
   * @returns the footprint offsets `{ dxMin, dxMax, dzMin, dzMax }`, or `null` if unbounded
   */
  const footprintOffsets = (
    z: number
  ): { dxMin: number; dxMax: number; dzMin: number; dzMax: number } | null => {
    const distance = distanceForZoom(z)
    const pitch = pitchForZoom(z)
    const camY = distance * Math.sin(pitch)
    const camZ = distance * Math.cos(pitch) // camera sits at (0, camY, camZ) relative to the target
    f.set(0, -camY, -camZ).normalize() // forward: from camera toward the target (origin)
    r.crossVectors(f, WORLD_UP).normalize() // right (east)
    u.crossVectors(r, f).normalize() // camera up
    const halfH = Math.tan(degToRad(camera.fov) / 2)
    const halfW = halfH * camera.aspect
    let dxMin = Infinity
    let dxMax = -Infinity
    let dzMin = Infinity
    let dzMax = -Infinity
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        dir
          .copy(f)
          .addScaledVector(r, sx * halfW)
          .addScaledVector(u, sy * halfH)
          .normalize()
        if (dir.y > -1e-3) return null // a corner ray does not point at the ground → footprint unbounded
        const t = -camY / dir.y
        const hx = t * dir.x // camera x is 0 relative to the target
        const hz = camZ + t * dir.z
        if (hx < dxMin) dxMin = hx
        if (hx > dxMax) dxMax = hx
        if (hz < dzMin) dzMin = hz
        if (hz > dzMax) dzMax = hz
      }
    }
    return { dxMin, dxMax, dzMin, dzMax }
  }

  /**
   * Clamp the target so the frustum footprint (at the rendered zoom) stays within the extent. When the
   * footprint is wider than the extent on an axis (or unbounded), the target locks to the extent centre.
   */
  const clampTarget = (): void => {
    const ext = opts.extent
    const cx = (ext.minX + ext.maxX) / 2
    const cz = (ext.minZ + ext.maxZ) / 2
    const fp = footprintOffsets(zoom)
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
    target.x = clamp(target.x, minX, maxX)
    target.z = clamp(target.z, minZ, maxZ)
    target.y = 0
  }

  const placeCamera = (): void => {
    const distance = distanceForZoom(zoom)
    const pitch = pitchForZoom(zoom)
    // Yaw locked north (north faces −Z): the camera sits south of and above the target, looking north-down.
    camera.position.set(
      target.x,
      target.y + distance * Math.sin(pitch),
      target.z + distance * Math.cos(pitch)
    )
    camera.lookAt(target)
  }

  // A wheel notch's / key press's worth of zoom-velocity impulse (eases out over `smoothingTau`).
  const zoomImpulse = (direction: number): number =>
    (direction * opts.zoomSpeed) / opts.smoothingTau
  const onKeyDown = (e: Event): void => {
    const ke = e as KeyboardEvent
    if (isEditableFocused()) return // don't hijack keys while a form field (e.g. lil-gui) has focus
    if (PAN_KEYS.has(ke.key)) {
      pressed.add(ke.key)
      ke.preventDefault() // stop the page from scrolling on arrow keys
    } else if (ZOOM_IN_KEYS.has(ke.key)) {
      velZoom += zoomImpulse(1) // keyboard equivalent of wheel-up (WCAG 2.1.1)
      ke.preventDefault()
    } else if (ZOOM_OUT_KEYS.has(ke.key)) {
      velZoom += zoomImpulse(-1)
      ke.preventDefault()
    }
  }
  const onKeyUp = (e: Event): void => {
    pressed.delete((e as KeyboardEvent).key)
  }
  const onWheel = (e: Event): void => {
    const we = e as WheelEvent
    if (we.ctrlKey) return // let the browser's native ctrl+wheel / pinch page-zoom through (WCAG 1.4.4)
    we.preventDefault() // stop the page from scrolling on wheel
    // Impulse into the zoom velocity (wheel up = deltaY < 0 → zoom in).
    velZoom += zoomImpulse(-Math.sign(we.deltaY))
  }
  const onPointerDown = (e: Event): void => {
    const pe = e as PointerEvent
    if (!opts.enableDrag || pe.button !== 0) return
    dragging = true
    lastX = pe.clientX
    lastY = pe.clientY
  }
  const onPointerMove = (e: Event): void => {
    const pe = e as PointerEvent
    pointerX = pe.clientX
    pointerY = pe.clientY
    if (!dragging) return
    // Grab-the-map: the ground follows the cursor, so the target moves opposite to the drag. The moved
    // amount is also accumulated so update() can turn it into a release-momentum velocity.
    const distance = distanceForZoom(zoom)
    const worldPerPixel = (2 * distance * Math.tan(degToRad(camera.fov) / 2)) / viewportHeight()
    const dx = -(pe.clientX - lastX) * worldPerPixel
    const dz = -(pe.clientY - lastY) * worldPerPixel
    target.x += dx
    target.z += dz
    dragMovedX += dx
    dragMovedZ += dz
    lastX = pe.clientX
    lastY = pe.clientY
  }
  const onPointerUp = (): void => {
    dragging = false
  }

  keyTarget.addEventListener('keydown', onKeyDown)
  keyTarget.addEventListener('keyup', onKeyUp)
  domElement.addEventListener('wheel', onWheel, { passive: false })
  domElement.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)

  clampTarget()
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
    setExtent(extent: MapRect): void {
      opts.extent = { ...extent } // clone so later caller mutations can't bypass the public API
      clampTarget()
    },
    getExtent(): MapRect {
      return { ...opts.extent }
    },
    getFootprint(): MapRect {
      const fp = footprintOffsets(zoom)
      if (!fp) {
        return { minX: target.x, maxX: target.x, minZ: target.z, maxZ: target.z }
      }
      return {
        minX: target.x + fp.dxMin,
        maxX: target.x + fp.dxMax,
        minZ: target.z + fp.dzMin,
        maxZ: target.z + fp.dzMax,
      }
    },
    getState(): MapCameraState {
      return { target: [target.x, 0, target.z], zoom }
    },
    setState(state: MapCameraState): void {
      target.set(state.target[0], 0, state.target[2])
      zoom = clamp(state.zoom, 0, 1)
      velX = velZ = velZoom = 0 // no residual inertia after a restore
      clampTarget()
      placeCamera()
    },
    update(delta = 0): void {
      if (delta > 0) {
        // Distance scales pan/edge speed so the map moves the same apparent amount at every zoom.
        const distance = distanceForZoom(zoom)
        if (dragging) {
          // A drag moves the target directly (grab-the-map); record its velocity for release momentum.
          velX = dragMovedX / delta
          velZ = dragMovedZ / delta
          dragMovedX = 0
          dragMovedZ = 0
        } else {
          // Held keys / edge-scroll set a target drive velocity; velocity eases toward it (and toward 0 on
          // release), giving inertia in every direction. `smoothingTau` is the ease-out time constant.
          let driveX = 0
          let driveZ = 0
          const pan = opts.panSpeed * (distance / opts.maxDistance)
          if (pressed.has('ArrowUp')) driveZ -= pan // north
          if (pressed.has('ArrowDown')) driveZ += pan
          if (pressed.has('ArrowLeft')) driveX -= pan
          if (pressed.has('ArrowRight')) driveX += pan
          if (opts.enableEdgeScroll && !Number.isNaN(pointerX)) {
            const m = opts.edgeScrollMargin
            const vw = viewportWidth()
            const vh = viewportHeight()
            const edge = opts.edgeScrollSpeed * (distance / opts.maxDistance)
            if (pointerX >= 0 && pointerX <= vw && pointerY >= 0 && pointerY <= vh) {
              if (pointerX < m) driveX -= edge
              else if (pointerX > vw - m) driveX += edge
              if (pointerY < m) driveZ -= edge
              else if (pointerY > vh - m) driveZ += edge
            }
          }
          // Ease-OUT feel: snap to full speed on input (fast start), then glide and decelerate on release.
          const decay = easeOutDecay(delta, opts.smoothingTau)
          velX = driveOrGlide(velX, driveX, decay)
          velZ = driveOrGlide(velZ, driveZ, decay)
          target.x += velX * delta
          target.z += velZ * delta
        }
        // Zoom inertia: the wheel injects velocity, which eases out; integrate then clamp.
        velZoom *= easeOutDecay(delta, opts.smoothingTau)
        zoom = clamp(zoom + velZoom * delta, 0, 1)
      }
      clampTarget()
      placeCamera()
    },
    dispose(): void {
      keyTarget.removeEventListener('keydown', onKeyDown)
      keyTarget.removeEventListener('keyup', onKeyUp)
      domElement.removeEventListener('wheel', onWheel)
      domElement.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      pressed.clear()
    },
  }
}
