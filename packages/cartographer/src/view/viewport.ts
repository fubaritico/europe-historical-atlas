/**
 * The view of the backdrop, as data — screen ↔ backdrop, pan, and zoom about a point.
 *
 * **The frame is the backdrop's** (decided 2026-09-29, before a line was written). The baked terrain is
 * the only thing georeferenced *by construction* — it is literally the atlas's output image — so the
 * canvas's coordinate system is its pixel grid. Projecting against any other box while painting this one
 * would slide everything with no error anywhere.
 *
 * **One scalar scale, and that is measured rather than assumed.** The backdrop is a Web Mercator raster
 * (zoom-5 tiles), and its pixels are square in projected space to within **0.031 %** — 592.635 screen
 * units per Mercator unit horizontally against 592.820 vertically, the difference being the height
 * rounded up from 1163.6 to 1164. Over the full 1164 rows that is a third of a pixel. Carrying two
 * scales to chase it would buy nothing and would let a non-uniform scale exist, which distorts.
 *
 * **Units: device pixels of the canvas backing store**, not CSS pixels. That is what drawing actually
 * uses, and it is what makes "stroke widths stay constant in screen pixels" (`s01`) true at any device
 * pixel ratio. Converting a pointer event's CSS coordinates is the caller's job, done once where the
 * events arrive.
 *
 * **No geography in this module, and no policy either.** Longitude and latitude are `core/geo`'s
 * business (`longitudeToHorizontal`, `latitudeToVertical`), and zoom limits are passed in rather than
 * declared here — a clamp with invented numbers is a silent substitution, and the real ones belong to
 * the wheel handler at step 4d. **What is deliberately absent**: the drag-versus-click threshold. `s01`
 * is explicit that it is decided **once**, where the drag lives, against the atlas's 4 px tolerance —
 * two thresholds in two places would disagree and no test could see it.
 */

/** A rectangle of pixels, used for the canvas and for the backdrop alike. */
export interface PixelSize {
  /** Width in pixels. */
  width: number
  /** Height in pixels. */
  height: number
}

/** A point, in whichever pixel space the function taking it names. */
export type Point = readonly [number, number]

/**
 * What part of the backdrop is on screen, and how big.
 *
 * Three numbers and nothing else, which is what "a viewport is data" means: it can be written as a
 * literal in a test, compared, stored, and handed across a boundary with no object graph behind it.
 */
export interface Viewport {
  /** Screen pixels per backdrop pixel. 1 means the backdrop is drawn at its own resolution. */
  scale: number
  /** Screen x of the backdrop's top-left pixel. */
  originX: number
  /** Screen y of the backdrop's top-left pixel. */
  originY: number
}

/**
 * A view that has not been framed yet.
 *
 * Scale zero, which draws nothing — **deliberately not a plausible view**. The canvas cannot know what
 * fits until it has a size, so the composition root opens the store on this and the first sizing replaces
 * it with `openingView`. Handing over an arbitrary scale instead would show the reader a corner of the map
 * for one frame and look like a bug in the framing rather than like a view nobody had chosen yet.
 */
export const UNFRAMED: Viewport = { scale: 0, originX: 0, originY: 0 }

/** The range a zoom may move within, passed in rather than declared — see this module's header. */
export interface ScaleLimits {
  /** The smallest allowed scale. */
  min: number
  /** The largest allowed scale. */
  max: number
}

/**
 * Where a backdrop pixel lands on screen.
 * @param viewport - the view
 * @param point - a position in backdrop pixels
 * @returns the position in screen pixels
 */
export function backdropToScreen(viewport: Viewport, point: Point): [number, number] {
  return [
    point[0] * viewport.scale + viewport.originX,
    point[1] * viewport.scale + viewport.originY,
  ]
}

/**
 * Which backdrop pixel is under a screen position.
 *
 * Returns values outside the backdrop for a position off it, deliberately: whether that is a miss is
 * the caller's question, and clamping here would answer it wrongly for a drag that leaves the canvas.
 *
 * **A scale of zero divides, and is left to**, which is this repository's recorded policy rather than an
 * oversight (`rules/error-handling.md`, "loud propagation"): the result is `±Infinity`, the coordinate
 * readout says so, and the defect reports itself. A viewport at scale zero shows a backdrop of no size,
 * so it is a programming fault upstream; substituting a plausible pixel here is the dangerous shape,
 * because nothing downstream could tell it from a real one.
 * @param viewport - the view
 * @param point - a position in screen pixels
 * @returns the position in backdrop pixels
 */
export function screenToBackdrop(viewport: Viewport, point: Point): [number, number] {
  return [
    (point[0] - viewport.originX) / viewport.scale,
    (point[1] - viewport.originY) / viewport.scale,
  ]
}

/**
 * Move the view by a screen-pixel offset — what a drag does.
 *
 * The scale is untouched, so the whole view moves with the pointer and the backdrop keeps its
 * resolution. One gesture's worth of movement, not one pointer event's: the caller accumulates.
 * @param viewport - the view
 * @param dx - screen pixels to move right
 * @param dy - screen pixels to move down
 * @returns the moved view
 */
export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { scale: viewport.scale, originX: viewport.originX + dx, originY: viewport.originY + dy }
}

/**
 * Keep a scale inside its limits.
 *
 * Reversed limits are treated as the pair they describe rather than left to produce a nonsense answer:
 * `min` above `max` would otherwise make the clamp return `max` for every input, which looks like a
 * working zoom stuck at one scale. Non-finite input returns `min`, the only value that is certainly in
 * range.
 * @param scale - the scale to constrain
 * @param limits - the allowed range
 * @returns the constrained scale
 */
export function clampScale(scale: number, limits: ScaleLimits): number {
  const low = Math.min(limits.min, limits.max)
  const high = Math.max(limits.min, limits.max)
  if (!Number.isFinite(scale)) return low
  return Math.min(high, Math.max(low, scale))
}

/**
 * Scale the view about a fixed screen position — the wheel, and the one invariant that matters.
 *
 * **The point under the pointer stays under the pointer** (`s01`, "zoom about the pointer"). That is the
 * whole specification, and the arithmetic falls out of it: if `b` is the backdrop pixel at `screen`
 * before, it must still be there after, so `origin' = screen - b × scale'`.
 *
 * Writing it as "move the origin by the scale ratio" is the version that drifts, because the ratio has to
 * be taken against the **clamped** scale and not the requested one — a zoom that hits its limit would
 * otherwise keep sliding the map while refusing to scale it, which reads as the map tearing away from
 * the pointer. Hence the clamp first, the factor recomputed from it, never the caller's factor.
 * @param viewport - the view
 * @param screen - the screen position to hold fixed, in screen pixels
 * @param factor - how much to multiply the scale by; above 1 zooms in
 * @param limits - the allowed scale range
 * @returns the scaled view, with `screen` over the same backdrop pixel as before
 */
export function zoomAbout(
  viewport: Viewport,
  screen: Point,
  factor: number,
  limits: ScaleLimits
): Viewport {
  const held = screenToBackdrop(viewport, screen)
  const scale = clampScale(viewport.scale * factor, limits)
  return {
    scale,
    originX: screen[0] - held[0] * scale,
    originY: screen[1] - held[1] * scale,
  }
}

/** A point of the viewport, in CSS pixels — where a menu opens, as a pointer event's client position. */
export interface ViewportPoint {
  /** From the viewport's left edge. */
  x: number
  /** From its top edge. */
  y: number
}
