/**
 * Laying a line on the relief's own triangles, as `fillTriangles` lays the fills.
 *
 * The relief is a grid of cells, each split into two flat triangles the way three's `PlaneGeometry` does:
 * `a, b, d` where `s + t ≤ 1` in cell coordinates, `b, c, d` beyond. A straight segment between two border
 * anchors 30 km apart crosses several of those triangles, and drawn as one chord it floats over a valley or
 * sinks under a hill — seen at an angle, it slides off the colour it bounds (the dev, 2026-10-16: on 1100,
 * 15 % of the border segments are longer than a cell, p99 52 km). Cut at every grid line and every cell
 * diagonal, each piece lies inside one triangle, and its two ends on that triangle's plane put the whole
 * piece on the surface.
 *
 * In grid coordinates `x = u · segX`, `y = v · segY`, the cell edges are `x = k` and `y = k`, and the
 * diagonals are `x + y = k` — `s + t = 1` in cell `(ix, iy)` is `x + y = ix + iy + 1`.
 */

import type { FillGrid } from './fillTriangles'
import type { UvPoint } from '../data/coastlineSource'

/** A straight piece of line between two grid coordinates. */
export type UvPair = readonly [UvPoint, UvPoint]

/** Two crossings closer than this, in segment parameter, are one — a segment through a grid node. */
const SAME_CROSSING = 1e-9

/**
 * The height of the relief's surface at `(u, v)`, on the plane of the triangle the point falls in.
 *
 * On a cell diagonal both formulas agree, so a point there is safe either way.
 * @param u - west→east, 0..1
 * @param v - north→south, 0..1
 * @param grid - the relief's subdivision
 * @param nodeY - the relief's height at grid node `(ix, iy)`, `iy` north→south
 * @returns the height
 */
export function planeHeight(
  u: number,
  v: number,
  grid: FillGrid,
  nodeY: (ix: number, iy: number) => number
): number {
  const x = Math.min(grid.segX, Math.max(0, u * grid.segX))
  const y = Math.min(grid.segY, Math.max(0, v * grid.segY))
  const ix = Math.min(grid.segX - 1, Math.floor(x))
  const iy = Math.min(grid.segY - 1, Math.floor(y))
  const s = x - ix
  const t = y - iy
  const b = nodeY(ix, iy + 1)
  const d = nodeY(ix + 1, iy)
  if (s + t <= 1) {
    const a = nodeY(ix, iy)
    return a + s * (d - a) + t * (b - a)
  }
  const c = nodeY(ix + 1, iy + 1)
  return c + (1 - s) * (b - c) + (1 - t) * (d - c)
}

/**
 * Where a linear quantity going from `p` to `q` crosses a whole number, as segment parameters in `(0, 1)`.
 * @param p - its value at the start
 * @param q - its value at the end
 * @param out - where the parameters are pushed
 * @returns nothing
 */
function integerCrossings(p: number, q: number, out: number[]): void {
  if (p === q) return
  const lo = Math.min(p, q)
  const hi = Math.max(p, q)
  for (let k = Math.floor(lo) + 1; k < hi; k++) out.push((k - p) / (q - p))
}

/**
 * Cut every segment where it crosses a cell edge or a cell diagonal of the relief, so each piece lies
 * inside one of its triangles. The pieces keep the segments' order and direction, so a dash pattern
 * accumulated along the buffer runs on unbroken.
 * @param segments - the segments, in normalized grid coordinates
 * @param grid - the relief's subdivision
 * @returns the pieces; a segment inside one triangle comes back as itself
 */
export function splitAtGrid(segments: readonly UvPair[], grid: FillGrid): UvPair[] {
  const pieces: UvPair[] = []
  const at: number[] = []
  for (const segment of segments) {
    const [a, b] = segment
    const x0 = a.u * grid.segX
    const y0 = a.v * grid.segY
    const x1 = b.u * grid.segX
    const y1 = b.v * grid.segY
    at.length = 0
    integerCrossings(x0, x1, at)
    integerCrossings(y0, y1, at)
    integerCrossings(x0 + y0, x1 + y1, at)
    if (at.length === 0) {
      pieces.push(segment)
      continue
    }
    at.sort((p, q) => p - q)
    let from = a
    let last = 0
    for (const t of at) {
      // A crossing at a node is found two or three times; one hard by an end would leave a sliver.
      if (t - last < SAME_CROSSING || 1 - t < SAME_CROSSING) continue
      const to = { u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t }
      pieces.push([from, to])
      from = to
      last = t
    }
    pieces.push([from, b])
  }
  return pieces
}
