/**
 * The sheet the map is printed on, as pixels.
 *
 * A plain field of vellum: one colour, mottled by the same fibre the terrain carries. Sharing that
 * grain is the whole point — a sheet with its own noise would give the map and its margin visibly
 * different paper, and the eye catches that immediately even when it cannot name it.
 */

import { paperNoise } from './paperNoise'

import type { RgbColor } from '../utils/color'

/** How the sheet is printed. */
export interface SheetOptions {
  /** The paper's own colour. */
  paper: RgbColor
  /** How strongly the fibre shows, as a fraction either side of the base colour. */
  grain: number
  /** Spatial scale of the fibre, in baked pixels. Larger is coarser. */
  grainScale: number
}

/**
 * Bake a square of vellum.
 *
 * Square because it is stretched over a rectangle: the fibre has no direction, so nobody can tell, and
 * a square keeps the call to one number.
 * @param size - the texture's side in pixels
 * @param options - the colour and the fibre
 * @returns an `RGBA` buffer of `size * size * 4` bytes
 */
export function composeSheetRgba(size: number, options: SheetOptions): Uint8Array {
  const rgba = new Uint8Array(size * size * 4)
  const base = [options.paper.r, options.paper.g, options.paper.b] as const
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Centred on one, so the fibre lightens as often as it darkens — paper, not dirt.
      const modulation = 1 + (paperNoise(x, y, options.grainScale) - 0.5) * options.grain
      const o = (y * size + x) * 4
      for (let k = 0; k < 3; k++) {
        rgba[o + k] = Math.round(Math.min(255, Math.max(0, (base[k] ?? 0) * modulation)))
      }
      rgba[o + 3] = 255
    }
  }
  return rgba
}
