import type { Rect } from '../geometry/marquee'
import type { PixelSize, Point } from '../view/viewport'

/**
 * The painter — it draws, and it decides nothing.
 *
 * **"Zéro décision"** is the plan's own word for this layer, and it is what makes the rest testable: every
 * position handed in is already in screen pixels, every colour comes from the style object, and nothing
 * here reads a document, a store or a viewport. Give it the same scene twice and it paints the same
 * pixels; that is the whole contract.
 *
 * **It takes a structural context, not `CanvasRenderingContext2D`.** Declaring the handful of members it
 * actually uses is what `rules/modular-architecture.md` asks for — the unit declares what it needs — and
 * it is what lets these tests run with a recording fake instead of a real canvas. jsdom has no 2D
 * context, so the alternative would have been not to test the painter at all.
 *
 * **Why 2D and not WebGL** (decided 2026-09-22, memory `editor-canvas-is-2d`): a 2D context gives the
 * compositing mode the atlas's bake already uses, `overlay`, for free, where WebGL would need a shader —
 * and three.js in this package would be a second renderer in the repository. ESLint forbids it.
 */

/**
 * The slice of a 2D context this painter uses.
 *
 * Narrow on purpose: every member added here is a member a fake has to grow, so the list is the painter's
 * real dependency surface, visible at a glance.
 */
export interface Painter2D {
  /** Erase a rectangle. */
  clearRect: (x: number, y: number, width: number, height: number) => void
  /** Fill a rectangle with the current `fillStyle`. */
  fillRect: (x: number, y: number, width: number, height: number) => void
  /** Outline a rectangle with the current `strokeStyle`. */
  strokeRect: (x: number, y: number, width: number, height: number) => void
  /** Start a new path. */
  beginPath: () => void
  /** Move the pen without drawing. */
  moveTo: (x: number, y: number) => void
  /** Draw to a point. */
  lineTo: (x: number, y: number) => void
  /** Join the path back to its start. */
  closePath: () => void
  /** Add a circular arc — the handles. */
  arc: (x: number, y: number, radius: number, start: number, end: number) => void
  /** Stroke the current path. */
  stroke: () => void
  /** Fill the current path. */
  fill: () => void
  /** Draw text. */
  fillText: (text: string, x: number, y: number) => void
  /** Draw an image, scaled into a destination rectangle — the backdrop. */
  drawImage: (
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number
  ) => void
  /**
   * The current fill colour.
   *
   * Typed as lib.dom's own union rather than `string`, and that is forced: a **mutable** property is
   * invariant, so a narrower type here makes a real `CanvasRenderingContext2D` unassignable to this
   * interface. The painter only ever writes strings into it.
   */
  fillStyle: string | CanvasGradient | CanvasPattern
  /** The current stroke colour. Same union, for the same reason. */
  strokeStyle: string | CanvasGradient | CanvasPattern
  /** The current stroke width, in the units the context is scaled to. */
  lineWidth: number
  /** The current font, as CSS. */
  font: string
  /**
   * Replace the transform — used for the two layers that are **not** handed over in screen pixels.
   *
   * See {@link CanvasScene.vectors}: the coastline is 95 233 points, and letting the engine apply the
   * affine costs nothing where doing it in JavaScript would allocate a fresh array of that size on every
   * `pointermove` of a pan.
   */
  setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => void
}

/**
 * Every colour and size the painter uses, injected.
 *
 * **The values come from `design/chrome.css`, never from taste** — the plan says so of the chrome and it
 * holds here. Passing them in rather than importing them keeps the painter indifferent to the theme, and
 * is what lets a test assert a colour without knowing which one the design chose this week.
 */
export interface PaintStyle {
  /** The canvas behind everything. `#d9ccad` in the design — the vellum the backdrop sits on. */
  background: string
  /** The editorial zone's frame. `rgba(42, 38, 31, 0.5)`, one pixel. */
  zoneStroke: string
  /** The zone's name, written above its frame. `#4a4238`. */
  zoneLabel: string
  /** The font of that name. `11px` in the design. */
  labelFont: string
  /** The edit stroke: thin, crisp, blue, no casing (decided 2026-09-22). */
  pathStroke: string
  /** How wide that stroke is, in screen pixels. */
  pathWidth: number
  /** An unselected handle's interior — white. */
  anchorFill: string
  /** A handle's outline, and a selected handle's interior. The reserved selection blue, `#5b93d6`. */
  anchorStroke: string
  /** A handle's radius in screen pixels. `s02` wants about 8 across, at any zoom. */
  anchorRadius: number
  /** The shoreline's ink. Darker than the terrain's own edge, so it reads over land and over sea. */
  coastStroke: string
  /** The shoreline's width in **screen** pixels, held constant as the view zooms. */
  coastWidth: number
  /** A river's ink. */
  riverStroke: string
  /** A river's width in screen pixels. */
  riverWidth: number
}

/** What there is to draw, all of it already in screen pixels. */
export interface CanvasScene {
  /**
   * The baked terrain, and where it goes on screen — `null` until it has been baked.
   *
   * **Null is the honest state, not a placeholder.** Baking reads two assets of about three megabytes
   * each and composites 1.5 million pixels, so there is a real interval during which the editor has a
   * canvas and no terrain. Drawing the vellum alone during it says "not loaded"; inventing a flat colour
   * that looks like land would say something false.
   */
  backdrop: { image: CanvasImageSource; rect: Rect } | null
  /** The editorial zone's rectangle on screen — a frame drawn over the backdrop, never the reference. */
  editorialZone: Rect
  /** What to call it, written above its frame. */
  zoneLabel: string
  /** The closed outlines of the open document, each a run of projected anchors. */
  rings: readonly (readonly Point[])[]
  /** Every anchor, projected, parallel to the document's own table. */
  anchors: readonly Point[]
  /** Which anchors are selected, by the same index. */
  selected: ReadonlySet<number>
  /**
   * The coastline and the rivers — **in backdrop pixels, not screen pixels**, with the view to apply.
   *
   * This is the one exception to "everything arrives already projected", and it is a measured one. The
   * shoreline is 95 233 points and the rivers 29 207; `remapToScreen` would build a fresh array of
   * ~125 000 pairs on **every `pointermove` of a pan**, which is roughly 2 MB of garbage per frame. The
   * canvas's own transform does the same affine in the graphics engine, for nothing.
   *
   * It is still not a decision the painter takes: it receives the three numbers and applies them. What
   * it must remember is to divide the stroke widths by `scale`, since they are specified in screen
   * pixels and the transform would otherwise magnify them with the map.
   *
   * `null` until the layers have loaded — the same honest state as `backdrop`.
   */
  vectors: {
    /** The shoreline, chained into contours. */
    coast: readonly { points: readonly (readonly [number, number])[]; closed: boolean }[]
    /** The river centrelines. */
    rivers: readonly { points: readonly (readonly [number, number])[] }[]
    /** Backdrop pixels to screen pixels: multiply by this. */
    scale: number
    /** Then add this horizontally. */
    originX: number
    /** And this vertically. */
    originY: number
  } | null
}

/** A full turn, for {@link Painter2D.arc}. */
const FULL_TURN = Math.PI * 2

/**
 * Draw the editorial zone: its frame, and its name above it.
 * @param ctx - the context to draw into
 * @param scene - what to draw
 * @param style - the colours and sizes
 */
function paintZone(ctx: Painter2D, scene: CanvasScene, style: PaintStyle): void {
  ctx.strokeStyle = style.zoneStroke
  ctx.lineWidth = 1
  ctx.strokeRect(
    scene.editorialZone.x,
    scene.editorialZone.y,
    scene.editorialZone.width,
    scene.editorialZone.height
  )
  ctx.fillStyle = style.zoneLabel
  ctx.font = style.labelFont
  ctx.fillText(scene.zoneLabel, scene.editorialZone.x, scene.editorialZone.y - 6)
}

/**
 * Stroke one closed outline.
 *
 * A ring of fewer than two points is skipped rather than stroked: a path with one point draws nothing on
 * a real context and a stray `moveTo` on a fake, which would make a test pass for the wrong reason.
 * @param ctx - the context to draw into
 * @param ring - the outline, in screen pixels
 */
function strokeRing(ctx: Painter2D, ring: readonly Point[]): void {
  const first = ring[0]
  if (first === undefined || ring.length < 2) return
  ctx.beginPath()
  ctx.moveTo(first[0], first[1])
  for (let index = 1; index < ring.length; index += 1) {
    const point = ring[index]
    if (point !== undefined) ctx.lineTo(point[0], point[1])
  }
  ctx.closePath()
  ctx.stroke()
}

/**
 * Draw the handles.
 *
 * **White with a blue outline, solid blue when selected** — the dev's own words, 2026-09-22, and `s02`
 * repeats them for the outline in progress. The selection blue is a reserved ink that no polity is ever
 * served, so a handle can never be mistaken for a territory.
 * @param ctx - the context to draw into
 * @param scene - what to draw
 * @param style - the colours and sizes
 */
function paintAnchors(ctx: Painter2D, scene: CanvasScene, style: PaintStyle): void {
  ctx.lineWidth = 1
  ctx.strokeStyle = style.anchorStroke
  for (let index = 0; index < scene.anchors.length; index += 1) {
    const anchor = scene.anchors[index]
    if (anchor === undefined) continue
    ctx.fillStyle = scene.selected.has(index) ? style.anchorStroke : style.anchorFill
    ctx.beginPath()
    ctx.arc(anchor[0], anchor[1], style.anchorRadius, 0, FULL_TURN)
    ctx.fill()
    ctx.stroke()
  }
}

/**
 * Paint the whole static scene, back to front.
 *
 * The order is the decision the painter *does* carry, and it is the only one: the vellum, then the baked
 * terrain, then the zone's frame, then the outlines, then the handles on top — a handle under an outline
 * could not be aimed at, and a frame under the terrain could not be seen.
 * @param ctx - the context to draw into
 * @param size - the canvas, in the same pixels the scene is in
 * @param scene - what to draw
 * @param style - the colours and sizes
 */
/**
 * Stroke a set of runs that are already in the context's current units.
 * @param ctx - the context, transformed to backdrop pixels
 * @param runs - the runs to stroke
 */
function strokeRuns(
  ctx: Painter2D,
  runs: readonly { points: readonly (readonly [number, number])[]; closed?: boolean }[]
): void {
  ctx.beginPath()
  for (const run of runs) {
    let first = true
    for (const [x, y] of run.points) {
      if (first) {
        ctx.moveTo(x, y)
        first = false
      } else ctx.lineTo(x, y)
    }
    if (run.closed === true) ctx.closePath()
  }
  // One path for every run of a layer, stroked once. Two thousand contours in a single `stroke()`
  // rather than two thousand calls: a 2D context pays per stroke, not per sub-path.
  ctx.stroke()
}

/**
 * Draw the coastline and the rivers, under the view's transform.
 *
 * **The transform is set and reset here, never left behind.** Everything else on this canvas is handed
 * over in screen pixels, so leaving the context scaled would silently magnify the handles and the
 * zone's label — a defect that looks like a styling mistake and is not.
 * @param ctx - the context
 * @param scene - what to draw
 * @param style - the colours and widths
 */
function paintVectors(ctx: Painter2D, scene: CanvasScene, style: PaintStyle): void {
  const vectors = scene.vectors
  if (vectors === null || vectors.scale <= 0) return
  ctx.setTransform(vectors.scale, 0, 0, vectors.scale, vectors.originX, vectors.originY)

  ctx.strokeStyle = style.riverStroke
  // Divided by the scale because the width is specified in screen pixels and the transform is about to
  // magnify everything it draws. Without this, a river at zoom 8 would be eight times too thick.
  ctx.lineWidth = style.riverWidth / vectors.scale
  strokeRuns(ctx, vectors.rivers)

  ctx.strokeStyle = style.coastStroke
  ctx.lineWidth = style.coastWidth / vectors.scale
  strokeRuns(ctx, vectors.coast)

  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

export function paintCanvas(
  ctx: Painter2D,
  size: PixelSize,
  scene: CanvasScene,
  style: PaintStyle
): void {
  ctx.clearRect(0, 0, size.width, size.height)
  ctx.fillStyle = style.background
  ctx.fillRect(0, 0, size.width, size.height)
  // The terrain goes over the vellum and under everything else: it is the ground the reader reports
  // against, and a handle beneath it could not be aimed at.
  if (scene.backdrop !== null) {
    const { rect } = scene.backdrop
    ctx.drawImage(scene.backdrop.image, rect.x, rect.y, rect.width, rect.height)
  }
  paintVectors(ctx, scene, style)
  paintZone(ctx, scene, style)
  ctx.strokeStyle = style.pathStroke
  ctx.lineWidth = style.pathWidth
  for (const ring of scene.rings) strokeRing(ctx, ring)
  paintAnchors(ctx, scene, style)
}
