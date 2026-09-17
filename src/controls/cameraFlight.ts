/**
 * A camera move the reader did not make by hand.
 *
 * Eased in *and* out, unlike the inertia: inertia answers an input that has just happened, so it snaps
 * and then glides, whereas a flight starts from nothing the reader did with their hands and has to
 * begin gently or the map appears to be yanked out from under them.
 */

import { clamp, easeInOut, lerp } from '../utils/math'

import type { ControlsState, Flight } from './controlsState'

/**
 * Carry a flight forward, and end it when it arrives.
 * @param state - the controls' state
 * @param flight - the flight in progress
 * @param delta - the frame time in seconds
 * @returns nothing
 */
export function advanceFlight(state: ControlsState, flight: Flight, delta: number): void {
  flight.elapsed += delta
  const t = easeInOut(flight.elapsed / flight.duration)
  state.target.x = lerp(flight.fromX, flight.toX, t)
  state.target.z = lerp(flight.fromZ, flight.toZ, t)
  state.zoom = lerp(flight.fromZoom, flight.toZoom, t)
  if (flight.elapsed >= flight.duration) state.flight = null
}

/**
 * Give the camera back to the reader, cancelling any flight.
 *
 * Called from every input handler. A map that keeps flying while someone is trying to steer it has
 * taken their camera away from them, which is worse than never having moved it.
 * @param state - the controls' state
 * @returns nothing
 */
export function interrupt(state: ControlsState): void {
  state.flight = null
}

/**
 * Begin a flight to a point on the ground, settling closer than it started.
 *
 * Under `prefers-reduced-motion` the duration is zero and the camera simply arrives: the destination is
 * the point, the arc is the flourish.
 * @param state - the controls' state
 * @param x - where to look, on X
 * @param z - the same on Z
 * @returns nothing
 */
export function beginFlight(state: ControlsState, x: number, z: number): void {
  // A flight must not fight the inertia it interrupts, or the ease is disturbed by a glide the reader
  // stopped asking for the moment they asked for this instead.
  state.velX = 0
  state.velZ = 0
  state.velZoom = 0
  const toZoom = clamp(state.zoom + state.opts.flyZoomIn, 0, 1)
  const duration = Math.max(0, state.opts.flyDurationMs) / 1000
  if (duration === 0) {
    state.target.x = x
    state.target.z = z
    state.zoom = toZoom
    state.flight = null
    return
  }
  state.flight = {
    fromX: state.target.x,
    fromZ: state.target.z,
    toX: x,
    toZ: z,
    fromZoom: state.zoom,
    toZoom,
    elapsed: 0,
    duration,
  }
}
