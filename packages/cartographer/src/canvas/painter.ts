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
}

/** What there is to draw, all of it already in screen pixels. */
export interface CanvasScene {
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
 * The order is the decision the painter *does* carry, and it is the only one: background, then the zone's
 * frame, then the outlines, then the handles on top — a handle under an outline could not be aimed at.
 * @param ctx - the context to draw into
 * @param size - the canvas, in the same pixels the scene is in
 * @param scene - what to draw
 * @param style - the colours and sizes
 */
export function paintCanvas(
  ctx: Painter2D,
  size: PixelSize,
  scene: CanvasScene,
  style: PaintStyle
): void {
  ctx.clearRect(0, 0, size.width, size.height)
  ctx.fillStyle = style.background
  ctx.fillRect(0, 0, size.width, size.height)
  paintZone(ctx, scene, style)
  ctx.strokeStyle = style.pathStroke
  ctx.lineWidth = style.pathWidth
  for (const ring of scene.rings) strokeRing(ctx, ring)
  paintAnchors(ctx, scene, style)
}
