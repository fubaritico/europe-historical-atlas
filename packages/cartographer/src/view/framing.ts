import type { PixelSize, Viewport } from './viewport'

/**
 * Framing: the viewports that are *computed* rather than gestured — fit the whole backdrop, fit a box.
 *
 * Separate from `viewport.ts` because it answers a different question. That module transforms a view
 * the reader is moving; this one *chooses* a view from an extent, which is what opening a file does
 * (`fitWhole`) and what double-clicking a polity does (`fitBox`, `s01` — "the view zooms and pans so its
 * extent fills the canvas with a margin").
 *
 * **Fitting is uniform and centred**, both for the same reason: the backdrop's pixels are square in
 * projected space, so one scale preserves shape. Fitting width and height independently would stretch
 * the map, which on a historical atlas is not a cosmetic matter — it moves coastlines.
 */

/** A rectangle of the backdrop, in backdrop pixels. */
export interface BackdropBox {
  /** Left edge. */
  x: number
  /** Top edge. */
  y: number
  /** Width; zero or negative means the box has no extent. */
  width: number
  /** Height; zero or negative means the box has no extent. */
  height: number
}

/**
 * Centre a box of the backdrop in the canvas, at a given scale.
 * @param canvas - the canvas, in screen pixels
 * @param box - the rectangle of the backdrop to centre, in backdrop pixels
 * @param scale - the scale to use
 * @returns the view
 */
function centred(canvas: PixelSize, box: BackdropBox, scale: number): Viewport {
  return {
    scale,
    originX: canvas.width / 2 - (box.x + box.width / 2) * scale,
    originY: canvas.height / 2 - (box.y + box.height / 2) * scale,
  }
}

/**
 * The scale at which a box fits inside a canvas, with a margin on every side.
 *
 * **A margin wider than the canvas yields a scale of zero rather than a negative one**, and the
 * difference matters: a negative scale mirrors the map, which draws something plausible and wrong, while
 * zero collapses it to a point — visibly nothing, and the fault reports itself. Same reasoning as the
 * division in `screenToBackdrop` (`rules/error-handling.md`, loud propagation).
 *
 * A box with no extent also yields zero, for the same reason: there is no scale at which an empty
 * rectangle fills anything, and inventing one would frame a point as if it were a country.
 * @param canvas - the canvas, in screen pixels
 * @param box - the rectangle to fit, in backdrop pixels
 * @param marginPx - screen pixels to leave on every side
 * @returns the scale, never negative
 */
export function fitScale(canvas: PixelSize, box: BackdropBox, marginPx: number): number {
  const availableWidth = Math.max(0, canvas.width - marginPx * 2)
  const availableHeight = Math.max(0, canvas.height - marginPx * 2)
  if (box.width <= 0 || box.height <= 0) return 0
  return Math.min(availableWidth / box.width, availableHeight / box.height)
}

/**
 * The view that shows a box of the backdrop as large as it will go, centred, with a margin.
 *
 * What double-clicking a polity in `{Polities}` does, once its extent has been turned into backdrop
 * pixels. The extent is the caller's to compute: this module deals in rectangles, not in geometry.
 * @param canvas - the canvas, in screen pixels
 * @param box - the rectangle to frame, in backdrop pixels
 * @param marginPx - screen pixels to leave on every side
 * @returns the view
 */
export function fitBox(canvas: PixelSize, box: BackdropBox, marginPx: number): Viewport {
  return centred(canvas, box, fitScale(canvas, box, marginPx))
}

/**
 * The view that shows the whole backdrop — what a freshly opened editor looks like.
 *
 * `s01`'s "the whole frame is visible", and the state every navigation scenario starts from.
 * @param canvas - the canvas, in screen pixels
 * @param backdrop - the backdrop's own size, in its pixels
 * @param marginPx - screen pixels to leave on every side
 * @returns the view
 */
export function fitWhole(canvas: PixelSize, backdrop: PixelSize, marginPx: number): Viewport {
  return fitBox(canvas, { x: 0, y: 0, width: backdrop.width, height: backdrop.height }, marginPx)
}
