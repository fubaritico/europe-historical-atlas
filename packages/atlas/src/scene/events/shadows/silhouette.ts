/**
 * A 3D icon's shadow as an image — data in, data out (ATLAS-298). Its triangles, slid along the light to its ground,
 * are filled into a coverage grid **as one shape**: a pixel two pieces cover is covered once, never darker (the dev,
 * 2026-10-27: « l'ombre n'est pas d'un seul dessin »). Then blurred, so its edge is as soft as a pin's (« des bords un
 * peu flous »). The grid's frame is the pins' (`shadowAlpha`): along the shadow's axis across its width, across it
 * down its height.
 */

import type { ShadowFrame } from './shadowAlpha'

/** Where a shadow lies, and how the light slides a point onto it. */
export interface SilhouetteGround {
  /** The foot's `x` in the world. */
  x: number
  /** The foot's `z` in the world. */
  z: number
  /** The ground's height under it, in the world, scaled as the relief is. */
  y: number
  /** The way the shadows fall, `[x, z]` (`shadowDirection`). */
  axis: readonly [number, number]
  /** The way the light travels, `[x, y, z]` (`sunFall`). */
  fall: readonly [number, number, number]
}

/**
 * Where a point of the world lands on the ground along the light, in the shadow's frame.
 * @param x - the point's `x`
 * @param y - its `y`
 * @param z - its `z`
 * @param ground - where the shadow lies
 * @returns `[s, t]`: along the shadow's axis from the foot, and across it
 */
export function groundPoint(
  x: number,
  y: number,
  z: number,
  ground: SilhouetteGround
): [number, number] {
  const [fx, fy, fz] = ground.fall
  // Slid along the light down to the ground.
  const slide = (ground.y - y) / fy
  const dx = x + fx * slide - ground.x
  const dz = z + fz * slide - ground.z
  // Into the frame: the axis, and the axis turned a quarter (`groundShadows`).
  const [ax, az] = ground.axis
  return [ax * dx + az * dz, -az * dx + ax * dz]
}

/**
 * Fill one triangle into a coverage grid: every pixel whose centre it holds set to one.
 * @param coverage - the grid, row by row
 * @param width - its pixels across
 * @param height - its pixels down
 * @param corners - the triangle's three corners, in pixels: `[x0, y0, x1, y1, x2, y2]`
 * @returns nothing; the grid is filled in place
 */
export function fillTriangle(
  coverage: Float32Array,
  width: number,
  height: number,
  corners: readonly [number, number, number, number, number, number]
): void {
  const [x0, y0, x1, y1, x2, y2] = corners
  const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
  // A triangle seen edge-on covers nothing.
  if (area === 0) return
  const left = Math.max(0, Math.floor(Math.min(x0, x1, x2)))
  const right = Math.min(width - 1, Math.ceil(Math.max(x0, x1, x2)))
  const top = Math.max(0, Math.floor(Math.min(y0, y1, y2)))
  const bottom = Math.min(height - 1, Math.ceil(Math.max(y0, y1, y2)))
  for (let row = top; row <= bottom; row++) {
    const py = row + 0.5
    for (let col = left; col <= right; col++) {
      const px = col + 0.5
      // The pixel's centre on the same side of every edge as the triangle, whichever way it winds.
      const a = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area
      const b = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area
      const c = 1 - a - b
      if (a >= 0 && b >= 0 && c >= 0) coverage[row * width + col] = 1
    }
  }
}

/**
 * Blur a coverage grid by a box twice over each axis — close to a gaussian, and cheap.
 * @param coverage - the grid, row by row
 * @param width - its pixels across
 * @param height - its pixels down
 * @param radius - the box's half-width, in pixels; zero leaves the grid as it is
 * @returns the blurred grid, a new one
 */
export function blurCoverage(
  coverage: Float32Array,
  width: number,
  height: number,
  radius: number
): Float32Array {
  let out: Float32Array = Float32Array.from(coverage)
  if (radius <= 0) return out
  for (let i = 0; i < 2; i++)
    out = boxPass(boxPass(out, width, height, radius, true), width, height, radius, false)
  return out
}

/**
 * One pass of a box blur along one axis.
 * @param source - the grid, row by row
 * @param width - its pixels across
 * @param height - its pixels down
 * @param radius - the box's half-width, in pixels
 * @param horizontal - along the rows, or down the columns
 * @returns the blurred grid, a new one
 */
function boxPass(
  source: Float32Array,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean
): Float32Array {
  const result = new Float32Array(source.length)
  const span = 2 * radius + 1
  // Past the grid's edge is clear ground.
  const at = (col: number, row: number): number =>
    col >= 0 && col < width && row >= 0 && row < height ? (source[row * width + col] ?? 0) : 0
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      let sum = 0
      for (let k = -radius; k <= radius; k++)
        sum += horizontal ? at(col + k, row) : at(col, row + k)
      result[row * width + col] = sum / span
    }
  }
  return result
}

/**
 * Pixel coordinates of a frame point: the axis across the image's width, the across down its height.
 * @param s - along the axis
 * @param t - across it
 * @param frame - the rectangle the image covers
 * @param width - its pixels across
 * @param height - its pixels down
 * @returns `[x, y]` in pixels
 */
export function framePixel(
  s: number,
  t: number,
  frame: ShadowFrame,
  width: number,
  height: number
): [number, number] {
  return [
    ((s - frame.sMin) / (frame.sMax - frame.sMin)) * width,
    ((t + frame.tHalf) / (2 * frame.tHalf)) * height,
  ]
}
