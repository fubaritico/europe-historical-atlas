import type { PixelSize, Viewport } from './viewport'

/**
 * What is worth drawing, and at what detail.
 *
 * **Why this exists, measured.** The coastline is 2 029 contours and 95 233 points, the rivers 591
 * polylines and 29 207 more, and the canvas redraws all of it on every change of view — a canvas keeps
 * no memory of what was drawn on it, so there is no "move what is already there". Two facts make most
 * of that work waste, and they are true at opposite ends of the zoom:
 *
 * - **zoomed in**, most of the world is off screen. Over France at scale 4, the Baltic, the Aegean and
 *   the Caspian are still being traced into a clipped path nobody sees;
 * - **zoomed out**, the largest contour's 25 629 points are drawn across about 1 200 pixels — twenty
 *   points per pixel, nineteen of which cannot change a single one.
 *
 * Both answers are arithmetic on the viewport, so they live here rather than in the painter: `viewport/` is
 * the leaf that defines screen space, and these can be exercised with literals.
 */

/** An axis-aligned box in backdrop pixels. */
export interface Box {
  /** Smallest horizontal coordinate. */
  left: number
  /** Smallest vertical coordinate. */
  top: number
  /** Largest horizontal coordinate. */
  right: number
  /** Largest vertical coordinate. */
  bottom: number
}

/**
 * The part of the backdrop the canvas currently shows, in backdrop pixels.
 *
 * The inverse of the view's affine: screen `0` is backdrop `-originX / scale`, and screen `width` is
 * `(width - originX) / scale`.
 * @param viewport - the current view
 * @param canvas - the canvas size in device pixels
 * @returns the visible box, in backdrop pixels
 */
export function visibleBox(viewport: Viewport, canvas: PixelSize): Box {
  const { scale, originX, originY } = viewport
  return {
    // `0 - originX` rather than `-originX`: the second yields **negative zero** at the origin, which
    // compares equal to zero with `<` but not with `Object.is` — so it survives into assertions and
    // into any future `Map` keyed on a coordinate. Cheaper to not produce it than to remember it.
    left: (0 - originX) / scale,
    top: (0 - originY) / scale,
    right: (canvas.width - originX) / scale,
    bottom: (canvas.height - originY) / scale,
  }
}

/**
 * Whether two boxes share any ground at all.
 *
 * Touching edges count as overlapping, which is the safe side of the question: a contour exactly on the
 * edge of the view has a stroke width, so half of it is inside.
 * @param a - the first box
 * @param b - the second
 * @returns `true` when they intersect or touch
 */
export function boxesOverlap(a: Box, b: Box): boolean {
  return a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom
}

/**
 * The box a run of points occupies.
 *
 * Computed once, when the layers load, and carried with the run — recomputing it per frame would cost
 * exactly the traversal this exists to avoid.
 * @param points - the run, in backdrop pixels
 * @returns its bounding box; an empty run gives a box at the origin
 */
export function boundsOf(points: readonly (readonly [number, number])[]): Box {
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const [x, y] of points) {
    if (x < left) left = x
    if (x > right) right = x
    if (y < top) top = y
    if (y > bottom) bottom = y
  }
  // An empty run has no box. Zero rather than the infinities, so that `boxesOverlap` answers `false`
  // for anything off the origin instead of matching everything, which is what Infinity would do.
  if (left === Infinity) return { left: 0, top: 0, right: 0, bottom: 0 }
  return { left, top, right, bottom }
}

/**
 * How far apart two points must be, in backdrop pixels, to be worth drawing both.
 *
 * **One screen pixel, expressed in the backdrop's own units.** At scale 1 that is one backdrop pixel and
 * nothing is dropped; at the opening view, where the whole 1 280-wide backdrop fits in about 1 200
 * screen pixels, it is a little over one — so the twenty-points-per-pixel case collapses to roughly one.
 * Zoomed in past 1 it becomes a fraction, and every point is kept, which is correct: that is exactly
 * when the detail becomes visible.
 *
 * **Squared, because the caller compares squared distances** — a hypot per point would put a square root
 * back into the loop this exists to shorten.
 * @param viewport - the current view
 * @returns the squared threshold, in backdrop pixels
 */
export function detailThresholdSquared(viewport: Viewport): number {
  if (viewport.scale <= 0) return 0
  const inBackdropPixels = 1 / viewport.scale
  return inBackdropPixels * inBackdropPixels
}
