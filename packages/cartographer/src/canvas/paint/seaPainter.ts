/**
 * The sea given back over the map's tints (CORE-421): an outline may run over the sea, and its colour, its borders and
 * its hatches stop on the land mask's coast — the terrain over the water only, laid where the backdrop lies.
 */

import type { Rect } from '../../geometry/marquee'

/** The part of the 2D context the sea needs. */
export interface SeaCanvas {
  /** Lay an image in a rectangle. */
  drawImage: (image: CanvasImageSource, x: number, y: number, width: number, height: number) => void
}

/** The terrain over the water only, and where the backdrop lies on screen. */
export interface SeaOnScreen {
  /** The image: the baked terrain with the land transparent, or `null` while it is not made. */
  sea: CanvasImageSource | null
  /** Where the backdrop lies on screen. */
  rect: Rect
}

/**
 * Lay the sea over what is drawn — at the opacity the caller set for the relief layer.
 * @param ctx - the context to draw into
 * @param backdrop - the sea and where it lies, or `null` before the backdrop is baked
 * @returns nothing; nothing is drawn without an image
 */
export function paintSea(ctx: SeaCanvas, backdrop: SeaOnScreen | null): void {
  if (!backdrop?.sea) return
  const { rect } = backdrop
  ctx.drawImage(backdrop.sea, rect.x, rect.y, rect.width, rect.height)
}
