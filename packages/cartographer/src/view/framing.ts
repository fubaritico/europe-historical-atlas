import { lonLatToBackdrop } from './projection'

import type { BackdropFrame } from './projection'
import type { PixelSize, Viewport } from './viewport'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

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
 * void the floor exists to forbid appears anyway. This is the clamp `view/viewport.ts` deliberately
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
 * The view an editor opens on: the editorial zone framed, but never pulled back past cover.
 *
 * **Two requirements that can contradict each other, and the dev stated both** — frame the editorial
 * zone, because that is the ground the author may draw on and a third of the backdrop lies outside it;
 * and never show void. On a wide window the zone fits at a scale *below* the cover scale, so fitting it
 * would open on exactly the emptiness the floor forbids. The larger of the two wins, which means the
 * zone is framed when it can be and overflows the short axis when it cannot — the same compromise a
 * photograph makes in a frame of the wrong shape.
 *
 * It is **recomputed on every resize** rather than stored, which is what makes the opening view
 * responsive: the two scales move with the canvas, and so does which of them wins.
 *
 * **It centres the zone and then holds the result, which is not the same as centring it.** The zone's
 * western limit is −45°, exactly where the backdrop begins, so centring it horizontally would ask for a
 * positive origin — void down the left-hand side — and the hold refuses. In practice the zone opens
 * flush with the canvas's left edge and centred vertically. Said here because the first version of this
 * header claimed "centred" flatly, and a test written from that claim accused correct code.
 * @param canvas - the canvas, in screen pixels
 * @param backdrop - the backdrop's own size, in its pixels
 * @param zone - the editorial zone, already projected into backdrop pixels
 * @param marginPx - screen pixels to leave around the zone when it does fit
 * @returns the view
 */
export function openingView(
  canvas: PixelSize,
  backdrop: PixelSize,
  zone: BackdropBox,
  marginPx: number
): Viewport {
  const scale = Math.max(
    fitScale(canvas, zone, marginPx),
    coverScale(canvas, { x: 0, y: 0, width: backdrop.width, height: backdrop.height })
  )
  return clampToCover(centred(canvas, zone, scale), canvas, backdrop)
}

/**
 * A geographic box as a rectangle of the backdrop.
 *
 * **The two corners are projected, never the four numbers scaled.** Latitude is not linear in Mercator,
 * so halving a span of degrees does not halve a span of pixels — `scene.ts` makes the same point about
 * the same rectangle, one transform further along. Getting it wrong puts the southern edge in the wrong
 * place, by more the taller the box is, which on the editorial zone is 56 degrees.
 * @param bounds - the geographic box
 * @param frame - the backdrop's own reference frame
 * @returns the rectangle, in backdrop pixels
 */
export function backdropBoxOfBounds(bounds: GeoBounds, frame: BackdropFrame): BackdropBox {
  const [left, top] = lonLatToBackdrop([bounds.west, bounds.north], frame)
  const [right, bottom] = lonLatToBackdrop([bounds.east, bounds.south], frame)
  return { x: left, y: top, width: right - left, height: bottom - top }
}
