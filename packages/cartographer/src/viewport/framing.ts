import type { PixelSize, Viewport } from './viewport'

/**
 * Framing: the viewports that are *computed* rather than gestured — fit the whole backdrop, fit a box.
 *
 * Separate from `viewport.ts` because it answers a different question. That module transforms a view
 * the reader is moving; this one *chooses* a view from an extent — what opening a file does
 * ({@link openingView}, cover), and fitting a box or the whole backdrop with a margin (`fitBox`, `fitWhole`),
 * which no gesture calls today.
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
 * The extent is the caller's to compute: this module deals in rectangles, not in geometry. No gesture
 * calls it today — a double-click on a row opens the polity's form (`s07`).
 * @param canvas - the canvas, in screen pixels
 * @param box - the rectangle to frame, in backdrop pixels
 * @param marginPx - screen pixels to leave on every side
 * @returns the view
 */
export function fitBox(canvas: PixelSize, box: BackdropBox, marginPx: number): Viewport {
  return centred(canvas, box, fitScale(canvas, box, marginPx))
}

/**
 * The view that shows the whole backdrop inside the canvas, with a margin — void around it on the long axis.
 *
 * Not the opening view, which is cover ({@link openingView}); no gesture calls this today.
 * @param canvas - the canvas, in screen pixels
 * @param backdrop - the backdrop's own size, in its pixels
 * @param marginPx - screen pixels to leave on every side
 * @returns the view
 */
export function fitWhole(canvas: PixelSize, backdrop: PixelSize, marginPx: number): Viewport {
  return fitBox(canvas, { x: 0, y: 0, width: backdrop.width, height: backdrop.height }, marginPx)
}

/**
 * The scale at which a box **covers** the canvas, leaving no empty ground anywhere.
 *
 * The opposite choice from {@link fitScale}, and the dev's call of 2026-10-08 for the **zoom-out
 * limit**: *"le zoom maximal doit correspondre au cover, à l'encombrement maximal que peut avoir la
 * carte."* Fitting lets a reader pull back until the backdrop floats in a void, which is a view of
 * nothing — every map on the web stops at cover instead, and this one has the same reason: there is no
 * ground out there to draw on.
 *
 * **No margin argument, deliberately.** A margin is the gap you leave *around* a fitted box; covering is
 * the state where no gap exists. Accepting one here would let a caller ask for a cover that does not
 * cover.
 * @param canvas - the canvas, in screen pixels
 * @param box - the rectangle that must cover it, in backdrop pixels
 * @returns the scale, or zero for a box with no extent
 */
export function coverScale(canvas: PixelSize, box: BackdropBox): number {
  if (box.width <= 0 || box.height <= 0) return 0
  return Math.max(canvas.width / box.width, canvas.height / box.height)
}

/**
 * Hold a view so the backdrop never uncovers the canvas.
 *
 * **The half that makes a cover-scale floor mean anything.** A minimum scale alone only promises that
 * the backdrop is *big enough* to cover; nothing stops a pan from sliding it off the side, and then the
 * void the floor exists to forbid appears anyway. This is the clamp `viewport/viewport.ts` deliberately
 * refused to invent — *"a clamp with invented numbers is a silent substitution, and the real ones belong
 * to the caller"*. Here the numbers are real: the canvas, and the backdrop at the current scale.
 *
 * **It gives up rather than lies when the backdrop is too small.** Below the cover scale the two
 * constraints contradict each other — the left edge wants to be at 0 and the right edge past the
 * canvas, and no origin satisfies both. It centres instead, which shows the whole backdrop with equal
 * gutters: visibly a smaller map, not a map shoved into a corner.
 * @param viewport - the view to hold
 * @param canvas - the canvas, in screen pixels
 * @param backdrop - the backdrop's own size, in its pixels
 * @returns the view, with its origin held inside the backdrop
 */
export function clampToCover(viewport: Viewport, canvas: PixelSize, backdrop: PixelSize): Viewport {
  const painted = {
    width: backdrop.width * viewport.scale,
    height: backdrop.height * viewport.scale,
  }
  return {
    scale: viewport.scale,
    originX: holdAxis(viewport.originX, canvas.width, painted.width),
    originY: holdAxis(viewport.originY, canvas.height, painted.height),
  }
}

/**
 * One axis of {@link clampToCover}.
 * @param origin - where the backdrop's edge sits, in screen pixels
 * @param canvas - the canvas's extent on this axis
 * @param painted - the backdrop's extent on this axis, at the current scale
 * @returns the held origin
 */
function holdAxis(origin: number, canvas: number, painted: number): number {
  if (painted < canvas) return (canvas - painted) / 2
  return Math.min(0, Math.max(canvas - painted, origin))
}

/**
 * The view an editor opens on: the whole backdrop at cover, centred — the ground the author may draw
 * anywhere on, with no void around it (2026-10-18, when the editorial zone it used to frame was removed).
 *
 * **Cover, never fit**: fitting the whole backdrop would leave void on the long axis whatever the canvas's
 * shape, the emptiness the zoom-out floor forbids. So the backdrop meets both edges on one axis and the
 * other overflows, cropped evenly. It is **recomputed on every resize** rather than stored, which is what
 * makes the opening view responsive.
 * @param canvas - the canvas, in screen pixels
 * @param backdrop - the backdrop's own size, in its pixels
 * @returns the view
 */
export function openingView(canvas: PixelSize, backdrop: PixelSize): Viewport {
  const whole = { x: 0, y: 0, width: backdrop.width, height: backdrop.height }
  return clampToCover(centred(canvas, whole, coverScale(canvas, whole)), canvas, backdrop)
}
