import { coverScale } from '../viewport/framing'

import type { EditorTool } from '../state/toolSlice'
import type { PixelSize, ScaleLimits } from '../viewport/viewport'

/**
 * How the hand moves the view — the zoom's arithmetic and the keys that pan, zoom and pick a tool.
 *
 * **Out of `controller.ts` on 2026-10-11**, when the tools pushed it past the 400-line budget: this is
 * the part of it that holds no state and touches no node, so it reads and tests alone. The controller
 * re-exports what it used to export, so no caller moved.
 */

/**
 * How far the view may be magnified past the backdrop's own resolution.
 *
 * **Thirty-two, raised from eight on 2026-10-08 because the first argument was borrowed and did not
 * apply.** It read: at scale 8 one backdrop pixel covers eight screen pixels, so the ground resolution
 * is 7.6 km / 8 ≈ 0.95 km per screen pixel at 45°N — finer than the 1.9 km cells the political raster
 * works in. True, and beside the point: **the political raster is the atlas's.** This editor stores
 * longitudes and latitudes at six decimals — about ten centimetres — and derives a border from the
 * anchors two outlines *share*, exactly, never from a rasterised cell. Nothing in the format cared
 * about 1.9 km.
 *
 * **What the ceiling is really for**, then: at scale 32 one screen pixel is about **240 m** of ground,
 * which is far below anything the project measures itself against — a city on the wrong side of a
 * frontier, the accuracy criterion of `H-15`, is an error of kilometres. Past that a reader would be
 * placing anchors at a precision no source supports, which is a different kind of wrong.
 *
 * **The blur is expected, not a reason to stop.** `s01` specifies it: *"the backdrop gives out before
 * the grid does"* — the terrain goes soft while the coastline, the rivers and the graticule stay sharp,
 * being vectors. Those are what a frontier is reported against, so the useful picture survives the
 * zoom the baked image does not.
 *
 * **And it costs nothing.** Measured: culling and decimation make a repaint *cheaper* the further in
 * the view goes — 28 % of the coastline's points at scale 8 against 48 % at scale 2.
 */
export const MAX_SCALE = 32

/** How much one press of a zoom key scales the view. A key is one discrete step, so it stays a factor. */
export const KEY_ZOOM_STEP = 1.1

/**
 * How many device pixels of wheel travel double the scale — the wheel's zoom, in one number.
 *
 * **The wheel is not a key, and treating it as one is what made the zoom unusable.** Until 2026-10-09 a
 * wheel event multiplied the scale by a fixed 1.1 and `deltaY`'s magnitude was thrown away. A mouse
 * notch produces one event; a trackpad swipe produces sixty to a hundred and twenty a second. So the
 * same gesture was 1.1 on a mouse and 1.1³⁰ ≈ 17× on a trackpad, which is the "trop sensible" the dev
 * reported and is not a value that could have been tuned — the two devices needed different arithmetic,
 * not a different constant.
 *
 * Scaling **exponentially in the distance travelled** makes it one device again: `exp(−Δ · k)` composes,
 * so sixty small events and one large one of the same total travel land on exactly the same scale.
 *
 * Calibrated so a 100-pixel delta — one notch of a conventional mouse wheel — still gives the 1.1 it
 * always gave, which is the one thing about the old behaviour that was right.
 */
export const ZOOM_PER_PIXEL = Math.log(1.1) / 100

/**
 * Device pixels of travel per unit of `deltaMode`, since a wheel does not report in one unit.
 *
 * `deltaMode` is 0 for pixels, 1 for lines and 2 for pages, and a mouse reporting lines is ordinary
 * rather than exotic — Firefox on Windows does it. Reading a line as a pixel would make that mouse
 * sixteen times gentler than the same mouse in another browser, which reads as "the zoom is broken
 * here" and is in fact a unit never converted.
 */
const DELTA_UNIT: Record<number, number> = { 0: 1, 1: 16, 2: 400 }

/**
 * What one wheel event should multiply the scale by.
 *
 * Exported so a test can read it with a literal event rather than through the DOM, and so the two
 * normalisations — the unit, and the exponential — are visible in one place.
 * @param deltaY - the event's own travel, in its own unit
 * @param deltaMode - 0 pixels, 1 lines, 2 pages
 * @returns the factor to apply to the scale
 */
export function wheelZoomFactor(deltaY: number, deltaMode: number): number {
  const pixels = deltaY * (DELTA_UNIT[deltaMode] ?? 1)
  return Math.exp(-pixels * ZOOM_PER_PIXEL)
}

/**
 * How far the pointer must travel, in device pixels, before a press counts as a drag.
 *
 * **Decided once, and here, because this is where the drag lives** (`s01`, explicitly: *"Do not decide
 * it a second time here"*). The DOM fires a `click` at the end of every drag with no threshold of its
 * own, so a second module deciding this would disagree about a slightly imprecise click and no test
 * could see the disagreement. Four pixels is the atlas's own tolerance, already proved there.
 */
export const DRAG_TOLERANCE = 4

/**
 * How near a handle, in screen pixels, a press must land to catch it — and how near the first anchor the
 * pointer must come for the Pen to offer to close.
 *
 * **Twice the handle's radius**, so the whole of the 8-pixel handle `s02` draws is a target plus a pixel
 * or so of grace around it; `s02` asks that closing use *"the same constant as every other handle"*, so
 * one number serves both. A feel tunable, in screen pixels, scaled to device pixels where it is used.
 */
export const HANDLE_HIT_RADIUS = 8

/** How far one arrow key pans, in device pixels. */
export const KEY_PAN_STEP = 60

/**
 * Keys that pan, and which way.
 *
 * The same four the atlas binds, so the two applications do not disagree about what an arrow does.
 */
export const PAN_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, KEY_PAN_STEP],
  ArrowDown: [0, -KEY_PAN_STEP],
  ArrowLeft: [KEY_PAN_STEP, 0],
  ArrowRight: [-KEY_PAN_STEP, 0],
}

/**
 * The tools, on the keys Illustrator uses — `s00`, settled 2026-09-22 from the dev's own reading — and
 * ‹R› for ⟨retrace⟩ (2026-10-14): Illustrator gives ‹R› to its Rotate tool, which this editor has no use
 * for (nothing here is rotated, `s03`).
 *
 * Lower-cased before the lookup, so ‹shift+P› still reaches the Pen: a capital is the same key.
 * ⟨navigate⟩ is deliberately absent — it is reached by *holding* ‹space›, which is a borrow rather than
 * a choice, and by its button in the rail at step 5.
 */
export const TOOL_KEYS: Record<string, EditorTool> = { p: 'draw', a: 'edit', r: 'retrace' }

/** Keys that zoom in — the atlas's own set, and what `design/CURSORS.md` specifies. */
export const ZOOM_IN_KEYS = new Set(['+', '=', 'PageUp'])

/** Keys that zoom out. */
export const ZOOM_OUT_KEYS = new Set(['-', '_', 'PageDown'])

/**
 * The scale range for a given canvas.
 *
 * **The lower bound is computed, not declared**: it is the scale at which the whole backdrop fits, so the
 * reader cannot zoom out until the map is a speck. Declaring a number instead would be wrong at every
 * canvas size, and this one is right at all of them.
 *
 * **It fits with the same margin the first framing uses, and that is not cosmetic.** A first version left
 * the margin out here, which made the minimum *larger* than the scale the editor opened on — so the very
 * first wheel notch, in either direction, snapped the view. Found by a test expecting a zoom out to zoom
 * out. The opening view now sits exactly on the lower bound, which is what "you cannot zoom out past the
 * whole map" should mean.
 * @param canvas - the canvas size, in device pixels
 * @param backdrop - the backdrop's own size
 * @returns the range a zoom may move within
 */
export function scaleLimitsFor(canvas: PixelSize, backdrop: PixelSize): ScaleLimits {
  return {
    min: coverScale(canvas, { x: 0, y: 0, width: backdrop.width, height: backdrop.height }),
    max: MAX_SCALE,
  }
}

/**
 * Which history move a key asks for: ‹ctrl+Z› undoes, ‹ctrl+shift+Z› redoes — ‹cmd› on a Mac (`s03`).
 *
 * Read on `key` lower-cased, so ‹shift› turning `z` into `Z` does not hide it. ‹alt› is never part of
 * either: held with ‹alt› the key is the platform's.
 * @param event - the key and its modifiers
 * @param event.key - the key pressed, compared lower-cased
 * @param event.ctrlKey - whether ‹ctrl› was held
 * @param event.metaKey - whether ‹cmd› was held, the Mac's ‹ctrl›
 * @param event.altKey - whether ‹alt› was held, which leaves the key to the platform
 * @param event.shiftKey - whether ‹shift› was held, which turns an undo into a redo
 * @returns `'undo'`, `'redo'`, or `null` for any other key
 */
export function historyKey(event: {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}): 'undo' | 'redo' | null {
  if (event.altKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') {
    return null
  }
  return event.shiftKey ? 'redo' : 'undo'
}
