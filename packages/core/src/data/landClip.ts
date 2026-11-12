/**
 * A line kept over land only — CORE-421: a polity's outline may run over the sea, and the fill stops on the coast; a
 * border drawn along such an outline must stop there too, or it shows as a stroke on the water.
 *
 * The land is the mask's, read as the tint layers read it: its bilinear coverage, the coast at one half.
 */

import type { UvPoint } from './coastlineSource'
import type { LandMask } from './landMask'

/**
 * Where the land ends: the mask's bilinear coverage at one half — the contour the atlas's tint layers threshold their
 * mask texture at, the Cartographer's sea image is cut at, and a border is cut at. One rule, so the three agree.
 */
export const COAST_COVERAGE = 0.5

/**
 * Whether a point lies over land, by {@link COAST_COVERAGE}.
 * @param mask - the land mask
 * @param u - the point's horizontal coordinate in the mask's uv
 * @param v - its vertical coordinate
 * @returns true over land
 */
export function isLandAt(mask: LandMask, u: number, v: number): boolean {
  return mask.coverage(u, v) >= COAST_COVERAGE
}

/** Samples per mask cell along a segment: two, so a strait one cell wide is never stepped over. */
const SAMPLES_PER_CELL = 2

/** Bisection steps for a crossing: a cell halved twelve times, far below anything drawn. */
const BISECTIONS = 12

/**
 * The point between two others where the land ends, by bisection on the coverage.
 * @param a - a point over land
 * @param b - a point over water
 * @param land - whether a point is over land
 * @returns the crossing
 */
function crossing(a: UvPoint, b: UvPoint, land: (p: UvPoint) => boolean): UvPoint {
  let dry = a
  let wet = b
  for (let k = 0; k < BISECTIONS; k++) {
    const mid = { u: (dry.u + wet.u) / 2, v: (dry.v + wet.v) / 2 }
    if (land(mid)) dry = mid
    else wet = mid
  }
  return { u: (dry.u + wet.u) / 2, v: (dry.v + wet.v) / 2 }
}

/**
 * Cut a line into the pieces that lie over land.
 * @param line - the line, in the mask's uv
 * @param mask - the land mask
 * @returns the pieces over land, each of two points at least, in the line's order; none when it lies all at sea
 */
export function landPieces(line: readonly UvPoint[], mask: LandMask): UvPoint[][] {
  const land = (p: UvPoint): boolean => isLandAt(mask, p.u, p.v)
  const pieces: UvPoint[][] = []
  let current: UvPoint[] = []
  const close = (): void => {
    if (current.length >= 2) pieces.push(current)
    current = []
  }
  const first = line[0]
  if (first === undefined) return pieces
  let wasLand = land(first)
  if (wasLand) current.push(first)
  const cellsU = mask.meta.width - 1
  const cellsV = mask.meta.height - 1
  let a = first
  for (const b of line.slice(1)) {
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot((b.u - a.u) * cellsU, (b.v - a.v) * cellsV) * SAMPLES_PER_CELL)
    )
    let prev = a
    for (let s = 1; s <= steps; s++) {
      const t = s / steps
      const p = s === steps ? b : { u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t }
      const isLand = land(p)
      if (isLand !== wasLand) {
        const at = wasLand ? crossing(prev, p, land) : crossing(p, prev, land)
        if (wasLand) {
          current.push(at)
          close()
        } else current.push(at)
        wasLand = isLand
      }
      prev = p
    }
    if (wasLand) current.push(b)
    a = b
  }
  close()
  return pieces
}
