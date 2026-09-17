/**
 * The fibrous mottling that makes a surface read as paper.
 *
 * Lifted out of the terrain compositor because the terrain is no longer the only thing printed on
 * vellum: the sheet the map sits on needs the same grain, and two implementations of it would give the
 * map and its margin visibly different paper.
 *
 * Trig-free on purpose. This runs once per output pixel over millions of them, and an integer hash is
 * what keeps a full bake in the tens of milliseconds rather than the hundreds.
 */

import { hashInts } from '../utils/hash'

/** Smoothstep-interpolated value noise in `[0, 1]` — smooth mottling, not per-pixel static. */
export function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hashInts(ix, iy)
  const b = hashInts(ix + 1, iy)
  const c = hashInts(ix, iy + 1)
  const d = hashInts(ix + 1, iy + 1)
  const top = a + (b - a) * ux
  const bottom = c + (d - c) * ux
  return top + (bottom - top) * uy
}

/**
 * Fractal Brownian motion (4 octaves of {@link valueNoise}) sampled at a spatial `scale` (px), giving a
 * fibrous vellum-paper mottling in `[0, 1]`.
 * @param x - pixel x
 * @param y - pixel y
 * @param scale - spatial scale in pixels (larger = coarser mottling)
 * @returns the paper value in `[0, 1]`
 */
export function paperNoise(x: number, y: number, scale: number): number {
  const s = Math.max(1, scale)
  let sum = 0
  let amplitude = 0.5
  let frequency = 1 / s
  let norm = 0
  for (let octave = 0; octave < 4; octave++) {
    sum += amplitude * valueNoise(x * frequency, y * frequency)
    norm += amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return sum / norm
}
