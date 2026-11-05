/**
 * The overlaps hatched (CARTO-364) — beside the painter, which calls it in its order, as it calls the cities.
 *
 * The dev, 2026-11-06: where outlines overlap, *"a zone hatched in the colour of the one and of the other"*; four
 * polities, four colours in turn. Inside each piece the relief is laid again, so the stripes read clean rather than
 * over the fills already doubled there, then the stripes go on as a fill does — `overlay`, at the fills' opacity. The
 * stripes run at 45°, a fixed width on screen at any zoom, and are pinned to the map rather than to the screen, so a
 * pan carries them with the ground.
 */

/** A point on screen, in device pixels. */
type Point = readonly [number, number]

/** What the hatching is painted with — the painter's context, declared here so the two files do not import each other. */
export interface HatchCanvas {
  /** Start a new path. */
  beginPath: () => void
  /** Move the pen without drawing. */
  moveTo: (x: number, y: number) => void
  /** Draw to a point. */
  lineTo: (x: number, y: number) => void
  /** Join the path back to its start. */
  closePath: () => void
  /** Fill the current path. */
  fill: () => void
  /** Fill a rectangle with the current fill colour. */
  fillRect: (x: number, y: number, width: number, height: number) => void
  /** Draw an image into a rectangle — the relief. */
  drawImage: (
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number
  ) => void
  /** Keep what is drawn next inside the current path. */
  clip: (fillRule?: 'nonzero' | 'evenodd') => void
  /** Push the state — the clip, the colours, the blend. */
  save: () => void
  /** Pop it. */
  restore: () => void
  /** The fill colour. */
  fillStyle: string | CanvasGradient | CanvasPattern
  /** How opaque what is drawn next is. */
  globalAlpha: number
  /** How what is drawn next combines with what is there. */
  globalCompositeOperation: GlobalCompositeOperation
}

/** One overlap on screen: its rings, even-odd, and the colours of the polities covering it, in turn. */
export interface HatchOnScreen {
  /** Its rings, in device pixels. */
  readonly rings: readonly (readonly Point[])[]
  /** One colour per polity covering it, two at least. */
  readonly colours: readonly string[]
}

/** How the hatching is laid. */
export interface HatchLayout {
  /** The vellum under the relief, laid again first. */
  background: string
  /** The relief, laid again inside each piece; `null` when the relief is not shown. */
  ground: {
    image: CanvasImageSource
    rect: { x: number; y: number; width: number; height: number }
  } | null
  /** The relief's opacity, 0 to 1. */
  groundAlpha: number
  /** How a stripe combines with the relief — the fills' blend. */
  blend: GlobalCompositeOperation
  /** The stripes' opacity, 0 to 1 — the fills'. */
  alpha: number
  /** One stripe's width, measured along the screen's horizontal, in device pixels. */
  width: number
  /** Where the map's origin lies on screen: the stripes are counted from it, so a pan carries them. */
  origin: Point
  /** The canvas, so a piece larger than the screen draws only the stripes that show. */
  size: { width: number; height: number }
}

/**
 * The box round a piece, cut to the canvas.
 * @param rings - the piece's rings
 * @param size - the canvas
 * @returns west, north, east, south — empty (west > east) when it lies off screen
 */
function boxOnScreen(
  rings: HatchOnScreen['rings'],
  size: HatchLayout['size']
): [number, number, number, number] {
  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const ring of rings) {
    for (const [x, y] of ring) {
      box[0] = Math.min(box[0], x)
      box[1] = Math.min(box[1], y)
      box[2] = Math.max(box[2], x)
      box[3] = Math.max(box[3], y)
    }
  }
  return [
    Math.max(box[0], 0),
    Math.max(box[1], 0),
    Math.min(box[2], size.width),
    Math.min(box[3], size.height),
  ]
}

/**
 * Lay the stripes of one colour over a box: every stripe whose rank, counted from the origin, falls to that colour.
 * A stripe is the band between the lines `x + y = u` and `x + y = u + width`.
 * @param ctx - the context, clipped to the piece
 * @param box - the box to cover
 * @param layout - the width and the origin
 * @param turn - which colour of how many: its rank and the count
 * @param turn.rank
 * @param turn.count
 */
function stripes(
  ctx: HatchCanvas,
  box: readonly [number, number, number, number],
  layout: HatchLayout,
  turn: { rank: number; count: number }
): void {
  const [west, north, east, south] = box
  const start = layout.origin[0] + layout.origin[1]
  const first = Math.floor((west + north - start) / layout.width)
  const last = Math.ceil((east + south - start) / layout.width)
  ctx.beginPath()
  for (let k = first; k <= last; k++) {
    if (((k % turn.count) + turn.count) % turn.count !== turn.rank) continue
    const u = start + k * layout.width
    ctx.moveTo(u - north, north)
    ctx.lineTo(u + layout.width - north, north)
    ctx.lineTo(u + layout.width - south, south)
    ctx.lineTo(u - south, south)
    ctx.closePath()
  }
  ctx.fill()
}

/**
 * Hatch one piece: clip to it, lay the relief again, then each colour's stripes.
 * @param ctx - the context
 * @param hatch - the piece
 * @param layout - how it is laid
 */
function hatchOne(ctx: HatchCanvas, hatch: HatchOnScreen, layout: HatchLayout): void {
  const box = boxOnScreen(hatch.rings, layout.size)
  if (box[0] >= box[2] || box[1] >= box[3]) return
  ctx.save()
  ctx.beginPath()
  for (const ring of hatch.rings) {
    const [head, ...rest] = ring
    if (head === undefined) continue
    ctx.moveTo(head[0], head[1])
    for (const [x, y] of rest) ctx.lineTo(x, y)
    ctx.closePath()
  }
  ctx.clip('evenodd')
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.fillStyle = layout.background
  ctx.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1])
  if (layout.ground !== null) {
    const { image, rect } = layout.ground
    ctx.globalAlpha = layout.groundAlpha
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height)
  }
  ctx.globalCompositeOperation = layout.blend
  ctx.globalAlpha = layout.alpha
  for (const [rank, colour] of hatch.colours.entries()) {
    ctx.fillStyle = colour
    stripes(ctx, box, layout, { rank, count: hatch.colours.length })
  }
  ctx.restore()
}

/**
 * Hatch every overlap. Leaves the context's state as it found it: each piece is drawn between a save and a restore.
 * @param ctx - the context
 * @param hatches - the overlaps on screen
 * @param layout - how they are laid
 */
export function paintHatches(
  ctx: HatchCanvas,
  hatches: readonly HatchOnScreen[],
  layout: HatchLayout
): void {
  for (const hatch of hatches) hatchOne(ctx, hatch, layout)
}
