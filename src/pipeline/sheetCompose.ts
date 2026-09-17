/**
 * The sheet the map is printed on, as pixels.
 *
 * A plain field of vellum: one colour, mottled by the very fibre the terrain carries — the same noise
 * field, sampled in the same coordinates, so it runs on across the map's edge without a seam. Sharing
 * the *function* is not enough: sampled in its own pixels the fibre comes out a different size in world
 * terms, and the eye catches two materials meeting even when it cannot name what it is seeing.
 */

import { paperNoise } from './paperNoise'

import type { RgbColor } from '../utils/color'

/** How the sheet is printed. */
export interface SheetOptions {
  /** The paper's own colour — the sea's, so the margin continues the water it abuts. */
  paper: RgbColor
  /** How strongly the fibre shows. The terrain's own value: it is the same paper. */
  grain: number
  /** Spatial scale of the fibre, in the TERRAIN's pixels. Likewise the terrain's own value. */
  grainScale: number
  /**
   * Where the sheet's first pixel falls in the terrain's pixel grid, and how many of those pixels one
   * sheet pixel spans.
   *
   * This is what makes it the same paper rather than similar paper. The fibre is a field sampled in
   * pixel space, so a sheet baked in its own pixels gets a grain of a different size in world terms —
   * measured at 23x coarser before this existed, which reads as two materials meeting at the map's
   * edge. Sampling the terrain's own field, at the terrain's own scale, makes the fibre continuous
   * across that edge: one sheet, with a map printed on part of it.
   */
  frame: { originX: number; originY: number; ratioX: number; ratioY: number }
}

/**
 * Bake a square of vellum.
 *
 * Square because it is stretched over a rectangle: the fibre has no direction, so nobody can tell, and
 * a square keeps the call to one number. The slight difference in density between the two axes that
 * follows is a few per cent, and invisible.
 * @param size - the texture's side in pixels
 * @param options - the colour and the fibre
 * @returns an `RGBA` buffer of `size * size * 4` bytes
 */
export function composeSheetRgba(size: number, options: SheetOptions): Uint8Array {
  const rgba = new Uint8Array(size * size * 4)
  const base = [options.paper.r, options.paper.g, options.paper.b] as const
  // Never sample finer than two of this texture's own pixels. The sheet covers more world than the
  // terrain at a lower density, so the terrain's fibre scale lands below its Nyquist limit — and an
  // undersampled noise does not come out fine, it comes out as a shimmer that crawls when the camera
  // moves. Deliberately coarser (about 1.5x here) rather than aliased, and stated because it IS a
  // compromise: the honest fix is to bake this in the worker at the terrain's own density.
  const reach = Math.max(options.frame.ratioX, options.frame.ratioY)
  const scale = Math.max(options.grainScale, reach * 2)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Centred on one, so the fibre lightens as often as it darkens — paper, not dirt.
      const modulation =
        1 +
        (paperNoise(
          options.frame.originX + x * options.frame.ratioX,
          options.frame.originY + y * options.frame.ratioY,
          scale
        ) -
          0.5) *
          options.grain
      const o = (y * size + x) * 4
      for (let k = 0; k < 3; k++) {
        rgba[o + k] = Math.round(Math.min(255, Math.max(0, (base[k] ?? 0) * modulation)))
      }
      rgba[o + 3] = 255
    }
  }
  return rgba
}
