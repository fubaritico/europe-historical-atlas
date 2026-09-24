/**
 * What the map camera holds and mutates, and the two curves every part of it reads.
 *
 * Split out of `mapControls` for size: the state is what the framing, the flight and the input handlers
 * all need, so it cannot live inside any one of them. The options live here too, so nothing has to
 * import back the other way and no cycle exists at all.
 */

import { Vector3 } from 'three'

import { clamp, lerp } from '@europe-historical-atlas/core/utils/math'

import type { PerspectiveCamera } from 'three'

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
  /**
   * How long a fly-to lasts, in milliseconds.
   *
   * Zero arrives at once, which is what `prefers-reduced-motion` asks for: the destination is the point,
   * the arc is the flourish. The composition root collapses it, the same way it collapses the inertia.
   */
  flyDurationMs: number
  /**
   * The zoom the focus mode settles at, in `[0, 1]`.
   *
   * One depth for every flight, not a step from wherever the camera happened to be: entering focus is
   * meant to put the reader at the same grazing close-up every time — the one the event text will be
   * read at.
   */
  flyFocusZoom: number
  /**
   * The zoom at the top of a flight's arc, in `[0, 1]`.
   *
   * Zero pulls out until the whole sheet is in view before diving back in. It is clamped below both
   * ends of the flight, so a value above either of them cannot turn the arc into a bounce.
   */
  flyArcZoom: number
}

/** Everything the controls hold and mutate, passed explicitly rather than captured in a closure. */
export interface ControlsState {
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
  /** How far the pointer has travelled during the current press, in CSS pixels. */
  pointerTravel: number
  /**
   * Whether the pointer gesture that just ended was a drag rather than a click.
   *
   * The browser sends a `click` after any press-and-release on the same element, however far the
   * pointer travelled in between — which is why a map has to decide for itself. It is decided **here**,
   * once, because this is where the drag lives: a second threshold elsewhere would be free to disagree
   * with this one about a slightly imprecise click, and nothing would fail.
   */
  pointerDragged: boolean
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
  /** The flight in progress, or `null` when the reader is driving. */
  flight: Flight | null
  /**
   * Where the camera stood before it entered focus, or `null` when it is not focused.
   *
   * Its presence *is* the mode: nothing else records that the reader is looking closely at something
   * rather than navigating. Note what does **not** clear it — panning, dragging and wheeling all go
   * through {@link interrupt}, which ends the flight and says nothing about the mode, so a look around
   * the target keeps the way back.
   */
  focusReturn: FocusReturn | null
}

/** A camera position to come back to, remembered when the focus mode is entered. */
export interface FocusReturn {
  /** Where the target stood, on X. */
  x: number
  /** The same on Z. */
  z: number
  /** The zoom it stood at. */
  zoom: number
}

/** A camera move the reader did not make by hand. */
export interface Flight {
  /** Where the target started. */
  fromX: number
  /** The same on Z. */
  fromZ: number
  /** Where it is going. */
  toX: number
  /** The same on Z. */
  toZ: number
  /** The zoom it started at. */
  fromZoom: number
  /** The zoom it settles at. */
  toZoom: number
  /**
   * The zoom at the top of the arc, reached halfway — or `null` for a flight that does not arc.
   *
   * `null` is not "no value": it is the flight going straight from one zoom to the other. **Leaving a
   * focus already carries its own pull-out** (maximum zoom back to wherever the reader was), so bending
   * it as well would send the camera out past the destination and back, which reads as a bounce rather
   * than as coming home.
   *
   * Resolved once when the flight begins rather than read per frame: a tunable that moved mid-flight
   * would bend the curve under a reader already watching it.
   */
  peakZoom: number | null
  /** Seconds since it started. */
  elapsed: number
  /** How long it lasts, in seconds. Never zero — an instant arrival is not a flight at all. */
  duration: number
}

/**
 * Viewport width, falling back to the window where the element has not been laid out yet.
 * @param state - the controls' state
 * @returns the width in CSS pixels
 */
export function viewportWidth(state: ControlsState): number {
  return state.domElement.clientWidth || window.innerWidth
}

/**
 * Viewport height, same fallback.
 * @param state - the controls' state
 * @returns the height in CSS pixels
 */
export function viewportHeight(state: ControlsState): number {
  return state.domElement.clientHeight || window.innerHeight
}

/**
 * Camera-to-target distance for a zoom level — the single source of truth for that curve.
 * @param opts - the tuning
 * @param z - zoom in `[0, 1]`
 * @returns the distance in world units
 */
export function distanceForZoom(opts: MapControlsOptions, z: number): number {
  return lerp(opts.maxDistance, opts.minDistance, z)
}

/**
 * Camera pitch for a zoom level — likewise.
 * @param opts - the tuning
 * @param z - zoom in `[0, 1]`
 * @returns the pitch in radians
 */
export function pitchForZoom(opts: MapControlsOptions, z: number): number {
  return degToRad(lerp(opts.maxPitchDeg, opts.minPitchDeg, z))
}

/**
 * The controls' state, at rest.
 * @param camera - the camera to drive
 * @param domElement - the element events are read from
 * @param options - the tuning, held by reference because the dev panel mutates it in place
 * @returns the state
 */
export function createControlsState(
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
    pointerTravel: 0,
    pointerDragged: false,
    pressed: new Set<string>(),
    dragging: false,
    lastX: 0,
    lastY: 0,
    // NaN until the pointer has moved once, so edge-scroll cannot fire before it is anywhere.
    pointerX: Number.NaN,
    pointerY: Number.NaN,
    scratch: { f: new Vector3(), r: new Vector3(), u: new Vector3(), dir: new Vector3() },
    flight: null,
    focusReturn: null,
  }
}

/**
 * Degrees → radians.
 * @param deg - angle in degrees
 * @returns angle in radians
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}
