/**
 * A camera move the reader did not make by hand.
 *
 * Eased in *and* out, unlike the inertia: inertia answers an input that has just happened, so it snaps
 * and then glides, whereas a flight starts from nothing the reader did with their hands and has to
 * begin gently or the map appears to be yanked out from under them.
 *
 * The trip is an **arc**: it pulls out, crosses, and dives back in. Not a flourish — once the focus mode
 * is entered, one target to the next runs from maximum zoom to maximum zoom, which without the arc is a
 * lateral travelling shot at ground level across a map twelve units wide, and unreadable.
 */

import { clamp01, easeInOut, lerp } from '@europe-atlas/core/utils/math'

import type { ControlsState, Flight, FocusReturn } from './controlsState'

/**
 * The zoom a flight is at, part-way through.
 *
 * Kept separate from {@link advanceFlight} because it is the whole shape of the movement and deserves to
 * be exercised with literals: `dip` is zero at both ends and one in the middle, so the curve leaves and
 * meets its two endpoints exactly whatever the arc asks for in between.
 *
 * A parabola rather than the sine this first used, and for an arithmetic reason rather than an
 * aesthetic one: `Math.sin(Math.PI)` is 1.22e-16, not zero, so the flight settled a hair short of the
 * zoom it was flying to. `4p(1 - p)` is exactly zero at both ends and exactly one in the middle in
 * floating point. It also fills out the departure a little, which suits a camera taking off.
 * @param flight - the flight in progress
 * @param t - raw progress, `elapsed / duration`; values outside `[0, 1]` are clamped
 * @returns the zoom in `[0, 1]`
 */
export function flightZoom(flight: Flight, t: number): number {
  const progress = clamp01(t)
  const base = lerp(flight.fromZoom, flight.toZoom, easeInOut(progress))
  if (flight.peakZoom === null) return base
  const dip = 4 * progress * (1 - progress)
  return lerp(base, flight.peakZoom, dip)
}

/**
 * The top of the arc for a flight settling at a given zoom.
 *
 * Offered rather than applied: whether a flight arcs at all is a question about *what the flight is
 * for*, which belongs to whoever is ordering it. Entering a focus arcs, because both ends can sit at
 * maximum zoom and the trip would otherwise be a lateral slide at ground level; coming back out does
 * not, because it already pulls out on its own.
 * @param state - the controls' state
 * @param toZoom - the zoom the flight will settle at
 * @returns the arc's top, clamped below both ends of the flight
 */
export function arcPeak(state: ControlsState, toZoom: number): number {
  // Clamped below both ends, so an arc zoom above either of them cannot make the middle of the trip
  // closer than its extremities — which is not a flight, it is a bounce.
  return Math.min(clamp01(state.opts.flyArcZoom), state.zoom, clamp01(toZoom))
}

/**
 * Carry a flight forward, and end it when it arrives.
 * @param state - the controls' state
 * @param flight - the flight in progress
 * @param delta - the frame time in seconds
 * @returns nothing
 */
export function advanceFlight(state: ControlsState, flight: Flight, delta: number): void {
  flight.elapsed += delta
  const t = clamp01(flight.elapsed / flight.duration)
  const eased = easeInOut(t)
  state.target.x = lerp(flight.fromX, flight.toX, eased)
  state.target.z = lerp(flight.fromZ, flight.toZ, eased)
  state.zoom = flightZoom(flight, t)
  if (flight.elapsed >= flight.duration) state.flight = null
}

/**
 * Give the camera back to the reader, cancelling any flight.
 *
 * Called from every input handler. A map that keeps flying while someone is trying to steer it has
 * taken their camera away from them, which is worse than never having moved it.
 *
 * It says nothing about the focus mode, and that is the point: panning, dragging and wheeling all come
 * through here, and none of them should cost the reader their way back.
 * @param state - the controls' state
 * @returns nothing
 */
export function interrupt(state: ControlsState): void {
  state.flight = null
}

/**
 * Where the camera would come to rest if nothing else happened.
 *
 * The live target is the wrong answer mid-flight: it is a point the camera is passing through, not one
 * it was ever meant to stop at. Remembering *that* as somewhere to return to would strand the reader
 * halfway along a trip they had already cancelled.
 * @param state - the controls' state
 * @returns the resting position and zoom
 */
export function restPoint(state: ControlsState): FocusReturn {
  const flight = state.flight
  if (flight) return { x: flight.toX, z: flight.toZ, zoom: flight.toZoom }
  return { x: state.target.x, z: state.target.z, zoom: state.zoom }
}

/**
 * Begin a flight to a point on the ground, settling at a given zoom.
 *
 * Under `prefers-reduced-motion` the duration is zero and the camera simply arrives: the destination is
 * the point, the arc is the flourish.
 * @param state - the controls' state
 * @param x - where to look, on X
 * @param z - the same on Z
 * @param toZoom - the zoom to settle at, clamped to `[0, 1]`
 * @param peakZoom - the top of the arc from {@link arcPeak}, or `null` to fly straight
 * @returns nothing
 */
export function beginFlight(
  state: ControlsState,
  x: number,
  z: number,
  toZoom: number,
  peakZoom: number | null = null
): void {
  // A flight must not fight the inertia it interrupts, or the ease is disturbed by a glide the reader
  // stopped asking for the moment they asked for this instead.
  state.velX = 0
  state.velZ = 0
  state.velZoom = 0
  const settled = clamp01(toZoom)
  const duration = Math.max(0, state.opts.flyDurationMs) / 1000
  if (duration === 0) {
    state.target.x = x
    state.target.z = z
    state.zoom = settled
    state.flight = null
    return
  }
  state.flight = {
    fromX: state.target.x,
    fromZ: state.target.z,
    toX: x,
    toZ: z,
    fromZoom: state.zoom,
    toZoom: settled,
    peakZoom,
    elapsed: 0,
    duration,
  }
}
