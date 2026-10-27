/**
 * How the reader's input moves the camera at each frame: the held keys and the screen's edges drive the target, a
 * drag throws it, the wheel spins the zoom — every one easing out — and a flight, when one runs, takes over.
 */

import { clamp } from '@europe-historical-atlas/core/utils/math'

import { advanceFlight } from './cameraFlight'
import { clampTarget, placeCamera } from './cameraFraming'
import { distanceForZoom, viewportHeight, viewportWidth } from './controlsState'

import type { ControlsState, MapControlsOptions } from './controlsState'

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
 * A wheel notch's or key press's worth of zoom-velocity impulse, which then eases out.
 * @param opts - the tuning
 * @param direction - `1` to zoom in, `-1` to zoom out
 * @returns the impulse
 */
export function zoomImpulse(opts: MapControlsOptions, direction: number): number {
  return (direction * opts.zoomSpeed) / opts.smoothingTau
}

/**
 * The drive velocity the held pan keys ask for.
 * @param pressed - which keys are held
 * @param pan - the pan speed at this zoom
 * @returns the drive on X and Z
 */
export function keyboardDrive(pressed: ReadonlySet<string>, pan: number): { x: number; z: number } {
  // Add up the held arrows; opposite keys cancel each other out.
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
  // Within the margin of an edge, push toward that edge, at most once per axis.
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
  // Speeds scale with the camera's distance, so the map moves alike on screen at every zoom.
  const pan = opts.panSpeed * (distance / opts.maxDistance)
  const keys = keyboardDrive(state.pressed, pan)
  // Edge scrolling only when enabled and once the pointer has been seen (NaN until it moves).
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
  // Snap each velocity to the input, or let it glide down, then move the target by it.
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
export function stepControls(state: ControlsState, delta: number): void {
  // Integrate only on a real step: a running flight takes over, otherwise the input drives.
  if (delta > 0) {
    const flight = state.flight
    if (flight) advanceFlight(state, flight, delta)
    else driveFrame(state, delta)
  }
  // Always keep the view in bounds and re-place the camera, even when nothing was integrated.
  clampTarget(state)
  placeCamera(state)
}
