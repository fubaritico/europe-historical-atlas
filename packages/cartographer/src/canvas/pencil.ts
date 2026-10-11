import { FREE_POINT_PROVENANCE } from '../state/editionSlice'

import { TAG } from './consoleTag'
import { lonLatAt, resolvedTarget } from './toolGestures'

import type { GestureContext } from './toolGestures'
import type { PencilSample, SessionPoint } from './toolSession'
import type { Point } from '../view/viewport'

/**
 * The Pencil — the Pen's freehand mode (the dev, 2026-10-11): pressed and dragged, it lays a point at
 * most every {@link PENCIL_INTERVAL_MS}, reported by eye, into the same outline the Pen draws. Released,
 * the outline stays open; it is closed as the Pen's is, on the first anchor or with ‹enter›.
 *
 * **Throttled, not debounced**: a point every interval while the pointer moves, not one when it stops.
 * Time is the event's own time stamp, handed in, so every rule here runs on literals.
 */

/** The least time between two Pencil points, in milliseconds — the dev's figure, 2026-10-11. */
export const PENCIL_INTERVAL_MS = 200

/**
 * The least move, in **device** pixels (the canvas's own, `positionOf` scaling by the pixel ratio), for
 * the Pencil to lay another point — below it the pointer is held still, and two points would share a spot.
 */
export const PENCIL_MIN_MOVE_PX = 1

/**
 * Whether the drag has gone far enough, long enough, for another point: the interval has passed **and**
 * the pointer has moved — a pointer held still lays nothing, so no two points share a spot.
 * @param last - the last sample
 * @param time - now, in milliseconds
 * @param at - the pointer, in screen pixels
 * @returns `true` when a point is due
 */
export function pencilPointDue(last: PencilSample, time: number, at: Point): boolean {
  return time - last.time >= PENCIL_INTERVAL_MS && moved(last, at)
}

/**
 * Whether the pointer is off the spot of the last sample.
 * @param last - the last sample
 * @param at - the pointer, in screen pixels
 * @returns `true` when it moved by a pixel or more
 */
function moved(last: PencilSample, at: Point): boolean {
  return Math.hypot(at[0] - last.at[0], at[1] - last.at[1]) >= PENCIL_MIN_MOVE_PX
}

/**
 * Lay one free point where the pointer is, extending the drag's own stroke — begun by its first point
 * on the map, so a drag that starts off the map never extends the one before it.
 * @param context - the session
 * @param drawing - the drag in progress
 * @param at - the pointer, in screen pixels
 * @param time - now, in milliseconds
 */
function lay(context: GestureContext, drawing: PencilSample, at: Point, time: number): void {
  drawing.time = time
  drawing.at = [at[0], at[1]]
  const point = lonLatAt(context, at)
  if (point === null) {
    drawing.offMap += 1
    return
  }
  const placed: SessionPoint = { at: point, provenance: FREE_POINT_PROVENANCE, anchor: null }
  context.session.outline.push(placed)
  context.session.snap = null
  if (drawing.stroke === null) {
    drawing.stroke = { first: placed, last: placed }
    context.session.strokes.push(drawing.stroke)
  } else drawing.stroke.last = placed
}

/**
 * Begin a Pencil drag where the press was, laying its first point.
 *
 * With nobody aimed at it lays nothing, as the Pen refuses (`s02`), and says so once.
 * @param context - the session and the store
 * @param at - where the press began, in screen pixels
 * @param time - the press's time stamp, in milliseconds
 */
export function pencilStart(context: GestureContext, at: Point, time: number): void {
  if (resolvedTarget(context) === null) {
    console.warn(`${TAG} nothing drawn: select a polity to draw in first.`)
    return
  }
  const drawing: PencilSample = { time, at: [at[0], at[1]], offMap: 0, stroke: null }
  context.session.drawing = drawing
  lay(context, drawing, at, time)
}

/**
 * Follow a Pencil drag: a point when one is due (`pencilPointDue`).
 * @param context - the session
 * @param at - the pointer, in screen pixels
 * @param time - the event's time stamp, in milliseconds
 */
export function pencilDrag(context: GestureContext, at: Point, time: number): void {
  const drawing = context.session.drawing
  if (drawing === null || !pencilPointDue(drawing, time, at)) return
  lay(context, drawing, at, time)
}

/**
 * End a Pencil drag: a last point where the button came up, unless the pointer has not moved since the
 * last one — so the stroke ends under the pointer, not up to 200 ms behind it.
 *
 * Samples that fell off the map are said here, once per drag — never per sample.
 * @param context - the session
 * @param at - where the button came up, in screen pixels
 * @param time - the event's time stamp, in milliseconds
 */
export function pencilEnd(context: GestureContext, at: Point, time: number): void {
  const drawing = context.session.drawing
  if (drawing === null) return
  if (moved(drawing, at)) lay(context, drawing, at, time)
  if (drawing.offMap > 0) {
    console.warn(
      `${TAG} ${String(drawing.offMap)} Pencil ${drawing.offMap === 1 ? 'point' : 'points'} fell off the map and were not placed.`
    )
  }
  context.session.drawing = null
}

/**
 * Drop a Pencil drag the system took back: the stroke it laid goes with it — a cancelled gesture is one
 * that did not happen (QUAL-005's rule for the white arrow, kept for the Pencil).
 * @param context - the session
 */
export function pencilCancel(context: GestureContext): void {
  const stroke = context.session.drawing?.stroke ?? null
  context.session.drawing = null
  if (stroke === null) return
  context.session.strokes = context.session.strokes.filter((held) => held !== stroke)
  const start = context.session.outline.indexOf(stroke.first)
  if (start >= 0) context.session.outline.splice(start)
}
