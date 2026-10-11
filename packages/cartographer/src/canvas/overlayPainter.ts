import type { PaintStyle, Painter2D } from './painter'
import type { OverlayScene } from './toolSession'
import type { PixelSize, Point } from '../view/viewport'

/**
 * The overlay canvas's painter — what moves with the pointer, drawn over the static canvas.
 *
 * **A second canvas, decided for step 4 and not to be reopened**: the static one is redrawn when the
 * document or the view changes, this one on every `pointermove`. A rubber band repainted through the
 * static canvas would redraw 125 000 points of coastline per pointer sample to move one line.
 *
 * Same contract as `painter.ts`: everything arrives in screen pixels, every colour from the style, and
 * nothing here decides what to show — `toolSession.overlayScene` did.
 */

/** A full turn, for an arc. */
const FULL_TURN = Math.PI * 2

/**
 * One handle: white with the selection blue around it, or solid blue.
 * @param ctx - the context
 * @param at - where, in screen pixels
 * @param solid - whether it is filled with the selection blue
 * @param style - the colours and sizes
 */
function handle(ctx: Painter2D, at: Point, solid: boolean, style: PaintStyle): void {
  ctx.fillStyle = solid ? style.anchorStroke : style.anchorFill
  ctx.beginPath()
  ctx.arc(at[0], at[1], style.anchorRadius, 0, FULL_TURN)
  ctx.fill()
  ctx.stroke()
}

/**
 * Stroke an open run of points.
 * @param ctx - the context
 * @param points - the run, in screen pixels
 */
function polyline(ctx: Painter2D, points: readonly Point[]): void {
  const first = points[0]
  if (first === undefined) return
  ctx.beginPath()
  ctx.moveTo(first[0], first[1])
  for (const point of points.slice(1)) ctx.lineTo(point[0], point[1])
  ctx.stroke()
}

/**
 * The outline in progress: its segments, the rubber band, and its handles.
 *
 * **The last anchor is solid, the earlier ones white** — the dev's own words in `s02`: *"Les points d'une
 * même ligne en cours de dessin sont blancs à part le dernier qui est bleu."* When the ring is offering to
 * close, the first anchor is solid too: that is the emphasis `s02` asks for before the click.
 * @param ctx - the context
 * @param scene - what to draw
 * @param style - the colours and sizes
 */
function paintOutline(ctx: Painter2D, scene: OverlayScene, style: PaintStyle): void {
  const last = scene.outline.at(-1)
  if (last === undefined) return
  polyline(ctx, scene.rubberTo === null ? scene.outline : [...scene.outline, scene.rubberTo])
  const lastIndex = scene.outline.length - 1
  scene.outline.forEach((point, index) => {
    handle(ctx, point, index === lastIndex || (index === 0 && scene.closing), style)
  })
}

/**
 * An anchor being dragged: the stretches it pulls, and its handle where it would land.
 * @param ctx - the context
 * @param scene - what to draw
 * @param style - the colours and sizes
 */
function paintMoving(ctx: Painter2D, scene: OverlayScene, style: PaintStyle): void {
  if (scene.moving === null) return
  const { at, from } = scene.moving
  for (const point of from) polyline(ctx, [point, at])
  handle(ctx, at, true, style)
}

/**
 * The coast the next click would follow, twice the outline's weight so it reads as an offer, and the
 * vertex it would snap onto.
 * @param ctx - the context
 * @param scene - what to draw
 * @param style - the colours and sizes
 */
function paintSnap(ctx: Painter2D, scene: OverlayScene, style: PaintStyle): void {
  if (scene.snapPreview !== null) {
    ctx.lineWidth = style.pathWidth * 2
    polyline(ctx, scene.snapPreview)
    ctx.lineWidth = style.pathWidth
  }
  if (scene.snapTarget !== null) handle(ctx, scene.snapTarget, true, style)
}

/**
 * The marquee being dragged: a thin rectangle in the edit stroke (`s03`, *"a selection rectangle follows
 * the pointer while it is down"*). Nothing is drawn once released — *"no bounding box and no frame"*.
 * @param ctx - the context
 * @param scene - what to draw
 * @param style - the colours and sizes
 */
function paintMarquee(ctx: Painter2D, scene: OverlayScene, style: PaintStyle): void {
  if (scene.marquee === null) return
  const { x, y, width, height } = scene.marquee
  ctx.lineWidth = style.pathWidth
  ctx.strokeRect(x, y, width, height)
}

/**
 * Paint the overlay: clear it, then whatever the session is doing.
 * @param ctx - the overlay's context
 * @param size - the canvas, in device pixels
 * @param scene - what to draw, in screen pixels
 * @param style - the colours and sizes, already in device pixels
 */
export function paintOverlay(
  ctx: Painter2D,
  size: PixelSize,
  scene: OverlayScene,
  style: PaintStyle
): void {
  ctx.clearRect(0, 0, size.width, size.height)
  ctx.strokeStyle = style.pathStroke
  ctx.lineWidth = style.pathWidth
  paintOutline(ctx, scene, style)
  paintSnap(ctx, scene, style)
  paintMoving(ctx, scene, style)
  paintMarquee(ctx, scene, style)
}
