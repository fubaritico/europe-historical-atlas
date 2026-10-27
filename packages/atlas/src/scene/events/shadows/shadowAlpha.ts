/**
 * A shadow's footprint rasterised as an image — data in, data out, so it is exercised with literals (ATLAS-298). The
 * image covers the footprint's frame: the axis runs along its width, the across along its height.
 */

import type { ShadowFootprint } from './shadowFootprint'

/** The rectangle around a footprint, in world units along its axis (`s`) and across it (`t`). */
export interface ShadowFrame {
  /** Where it starts along the axis, behind the foot. */
  sMin: number
  /** Where it ends along the axis, past the tip. */
  sMax: number
  /** Its half-height across the axis. */
  tHalf: number
}

/**
 * The rectangle a footprint fits in, its soft edge included.
 * @param footprint - the shadow's shape
 * @returns its frame
 */
export function shadowFrame(footprint: ShadowFootprint): ShadowFrame {
  const reach = (radius: number): number => radius * (1 + footprint.softness)
  let sMin = 0
  let sMax = 0
  let tHalf = 0
  for (const { from, to, radius } of footprint.capsules) {
    sMin = Math.min(sMin, Math.min(from, to) - reach(radius))
    sMax = Math.max(sMax, Math.max(from, to) + reach(radius))
    tHalf = Math.max(tHalf, reach(radius))
  }
  return { sMin, sMax, tHalf }
}

/**
 * How dark the shadow is at a point: one inside a stroke, fading to zero across the soft edge.
 * @param s - along the axis
 * @param t - across it
 * @param footprint - the shadow's shape
 * @returns the darkness, 0 to 1
 */
export function shadowDensity(s: number, t: number, footprint: ShadowFootprint): number {
  let density = 0
  for (const { from, to, radius } of footprint.capsules) {
    // The distance to the stroke's segment, less its radius: inside at zero or below.
    const along = Math.min(Math.max(s, Math.min(from, to)), Math.max(from, to))
    const outside = Math.hypot(s - along, t) - radius
    const soft = radius * footprint.softness
    const fade = soft > 0 ? 1 - outside / soft : outside <= 0 ? 1 : 0
    density = Math.max(density, Math.min(1, Math.max(0, fade)))
  }
  // Smoothed, so the edge has no visible ramp.
  return density * density * (3 - 2 * density)
}

/**
 * The footprint as an RGBA image, black, its darkness in the alpha: pixel centres sampled across the frame, the first
 * row at the frame's negative side.
 * @param footprint - the shadow's shape
 * @param frame - the rectangle the image covers
 * @param width - pixels along the axis
 * @param height - pixels across it
 * @returns the pixels, four bytes each, row by row
 */
export function shadowAlpha(
  footprint: ShadowFootprint,
  frame: ShadowFrame,
  width: number,
  height: number
): Uint8Array {
  const pixels = new Uint8Array(width * height * 4)
  for (let row = 0; row < height; row++) {
    const t = -frame.tHalf + ((row + 0.5) / height) * 2 * frame.tHalf
    for (let col = 0; col < width; col++) {
      const s = frame.sMin + ((col + 0.5) / width) * (frame.sMax - frame.sMin)
      // Black: only the alpha carries the shadow.
      pixels[(row * width + col) * 4 + 3] = Math.round(shadowDensity(s, t, footprint) * 255)
    }
  }
  return pixels
}
