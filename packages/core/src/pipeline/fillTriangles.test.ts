import { describe, expect, it } from 'vitest'

import {
  boundaryCells,
  clipEdgeToGrid,
  clipHalfPlane,
  edgesByRow,
  edgesOf,
  evenOddTest,
  fillTriangles,
} from './fillTriangles'

import type { FillGrid } from './fillTriangles'
import type { UvPoint } from '../data/coastlineSource'

const GRID: FillGrid = { segX: 8, segY: 8 }

/**
 * A ring from cell coordinates, as normalized `(u, v)` on {@link GRID}.
 * @param points - `[x, y]` pairs in cells
 * @returns the ring
 */
const ring = (...points: [number, number][]): UvPoint[] =>
  points.map(([x, y]) => ({ u: x / GRID.segX, v: y / GRID.segY }))

/**
 * The area of a fill, in square cells.
 * @param fill - flat `u, v`, three vertices per triangle
 * @returns the area
 */
function area(fill: Float32Array): number {
  let sum = 0
  for (let o = 0; o < fill.length; o += 6) {
    const ax = (fill[o] ?? 0) * GRID.segX
    const ay = (fill[o + 1] ?? 0) * GRID.segY
    const bx = (fill[o + 2] ?? 0) * GRID.segX
    const by = (fill[o + 3] ?? 0) * GRID.segY
    const cx = (fill[o + 4] ?? 0) * GRID.segX
    const cy = (fill[o + 5] ?? 0) * GRID.segY
    sum += Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2
  }
  return sum
}

/**
 * Whether every triangle of a fill lies in a single plane of the relief: all three vertices inside one
 * of the two triangles of one cell, within rounding.
 * @param fill - flat `u, v`
 * @returns `true` when every piece sits on one plane
 */
function everyPieceOnOnePlane(fill: Float32Array): boolean {
  const eps = 1e-4
  for (let o = 0; o < fill.length; o += 6) {
    const xs = [0, 2, 4].map((k) => (fill[o + k] ?? 0) * GRID.segX)
    const ys = [1, 3, 5].map((k) => (fill[o + k] ?? 0) * GRID.segY)
    const cx = xs.reduce((sum, x) => sum + x, 0) / 3
    const cy = ys.reduce((sum, y) => sum + y, 0) / 3
    const ix = Math.floor(cx)
    const iy = Math.floor(cy)
    // Written out here rather than asked of the module: three's PlaneGeometry splits a cell along the
    // diagonal from (ix, iy + 1) to (ix + 1, iy), so in cell-local s, t the planes are s + t ≤ 1 and ≥ 1.
    const local = xs.map((x, k) => [x - ix, (ys[k] ?? 0) - iy] as const)
    const inBox = local.every(([s, t]) => s >= -eps && t >= -eps && s <= 1 + eps && t <= 1 + eps)
    const fits =
      inBox &&
      (local.every(([s, t]) => s + t <= 1 + eps) || local.every(([s, t]) => s + t >= 1 - eps))
    if (!fits) return false
  }
  return true
}

/**
 * The area of a simple polygon by the shoelace formula — a reference independent of the module.
 * @param points - its vertices, in cells
 * @returns the area
 */
const shoelace = (points: [number, number][]): number =>
  Math.abs(
    points.reduce((sum, [x, y], i) => {
      const [nx, ny] = points[(i + 1) % points.length] ?? [0, 0]
      return sum + x * ny - nx * y
    }, 0)
  ) / 2

describe('fillTriangles', () => {
  describe('happy path', () => {
    it('fills a polygon with exactly its own area', () => {
      // A triangle cutting across cells at angles no grid line follows.
      const [fill] = fillTriangles([{ rings: [ring([0.3, 0.2], [6.7, 1.1], [2.2, 5.9])] }], GRID)
      const exact = Math.abs((6.7 - 0.3) * (5.9 - 0.2) - (2.2 - 0.3) * (1.1 - 0.2)) / 2
      expect(area(fill ?? new Float32Array())).toBeCloseTo(exact, 6)
    })

    it('lays every piece in one plane of the relief, so none floats or sinks', () => {
      const [fill] = fillTriangles([{ rings: [ring([0.3, 0.2], [6.7, 1.1], [2.2, 5.9])] }], GRID)
      expect(everyPieceOnOnePlane(fill ?? new Float32Array())).toBe(true)
    })

    it('gives a cell no border crosses the relief own two triangles, split as PlaneGeometry splits it', () => {
      const [fill] = fillTriangles([{ rings: [ring([0, 0], [3, 0], [3, 3], [0, 3])] }], GRID)
      // The centre cell (1, 1) is whole: a, b, d then b, c, d — the diagonal from (1, 2) to (2, 1).
      const cell = [1, 1, 1, 2, 2, 1, 1, 2, 2, 2, 2, 1].map((n, k) =>
        k % 2 === 0 ? n / GRID.segX : n / GRID.segY
      )
      const triangles = Array.from({ length: (fill?.length ?? 0) / 12 }, (_, t) =>
        Array.from(fill?.slice(t * 12, t * 12 + 12) ?? [])
      )
      expect(
        triangles.some((tris) => tris.every((value, k) => Math.abs(value - (cell[k] ?? 0)) < 1e-6))
      ).toBe(true)
    })
  })

  describe('variants', () => {
    it('leaves a hole empty', () => {
      const outer = ring([0, 0], [6, 0], [6, 6], [0, 6])
      const hole = ring([2, 2], [4, 2], [4, 4], [2, 4])
      const [fill] = fillTriangles([{ rings: [outer, hole] }], GRID)
      expect(area(fill ?? new Float32Array())).toBeCloseTo(36 - 4, 6)
    })

    it('fills an island inside a hole, two levels down', () => {
      const outer = ring([0, 0], [7, 0], [7, 7], [0, 7])
      const hole = ring([1, 1], [6, 1], [6, 6], [1, 6])
      const island = ring([2.5, 2.5], [4.5, 2.5], [4.5, 4.5], [2.5, 4.5])
      const [fill] = fillTriangles([{ rings: [outer, hole, island] }], GRID)
      expect(area(fill ?? new Float32Array())).toBeCloseTo(49 - 25 + 4, 6)
    })

    it('fills four nested rings by the even-odd rule: in, out, in, out', () => {
      const [fill] = fillTriangles(
        [
          {
            rings: [
              ring([0, 0], [8, 0], [8, 8], [0, 8]),
              ring([1, 1], [7, 1], [7, 7], [1, 7]),
              ring([2, 2], [6, 2], [6, 6], [2, 6]),
              ring([3, 3], [5, 3], [5, 5], [3, 5]),
            ],
          },
        ],
        GRID
      )
      expect(area(fill ?? new Float32Array())).toBeCloseTo(64 - 36 + 16 - 4, 6)
    })

    it('fills two separate rings of one polity, its mainland and an island', () => {
      const [fill] = fillTriangles(
        [{ rings: [ring([0, 0], [2, 0], [2, 2], [0, 2]), ring([5, 5], [6.5, 5], [6.5, 6.5])] }],
        GRID
      )
      expect(area(fill ?? new Float32Array())).toBeCloseTo(4 + 1.125, 6)
    })

    it('leaves empty what two overlapping rings of one polity cover twice, by the even-odd rule', () => {
      // Two squares overlapping on [2, 4] × [2, 4]: a triangulator counts the overlap twice; the even-odd
      // rule — the editor's — leaves it empty.
      const a = ring([0, 0], [4, 0], [4, 4], [0, 4])
      const b = ring([2, 2], [6, 2], [6, 6], [2, 6])
      const [fill] = fillTriangles([{ rings: [a, b] }], GRID)
      expect(area(fill ?? new Float32Array())).toBeCloseTo(16 + 16 - 2 * 4, 6)
    })

    it('fills a ring that crosses itself by the even-odd rule, exactly', () => {
      // A bowtie off the grid lines: two lobes meeting where the diagonals cross, at (3.5, 3.5). A
      // triangulator gets this wrong — the first version of this module did.
      const bowtie = ring([1.2, 1.3], [5.8, 5.7], [5.8, 1.3], [1.2, 5.7])
      const [fill] = fillTriangles([{ rings: [bowtie] }], GRID)
      // The crossing point of the two diagonals, then the two triangles left and right of it.
      const cx = 3.5
      const lobe = ((5.7 - 1.3) * (cx - 1.2)) / 2
      expect(area(fill ?? new Float32Array())).toBeCloseTo(2 * lobe, 6)
    })

    it('fills nothing where two identical rings cancel, as the even-odd rule does', () => {
      const square = ring([1, 1], [4, 1], [4, 4], [1, 4])
      expect(fillTriangles([{ rings: [square, square] }], GRID)[0]?.length).toBe(0)
    })

    it('keeps the polities in the order given, one fill each', () => {
      const fills = fillTriangles(
        [
          { rings: [ring([0, 0], [1, 0], [1, 1], [0, 1])] },
          { rings: [ring([4, 4], [6, 4], [6, 6], [4, 6])] },
        ],
        GRID
      )
      expect(fills.map((fill) => area(fill))).toEqual([
        expect.closeTo(1, 6) as unknown as number,
        expect.closeTo(4, 6) as unknown as number,
      ])
    })
  })

  describe('managed errors', () => {
    it('returns an empty fill for a polity with no ring', () => {
      expect(fillTriangles([{ rings: [] }], GRID)[0]?.length).toBe(0)
    })

    it('ignores a ring too short to enclose anything', () => {
      const [fill] = fillTriangles([{ rings: [ring([1, 1], [3, 3])] }], GRID)
      expect(fill?.length).toBe(0)
    })

    it('reads a ring that repeats its first vertex at the end like one that does not', () => {
      const open = fillTriangles([{ rings: [ring([0, 0], [3, 0], [3, 3])] }], GRID)[0]
      const closed = fillTriangles([{ rings: [ring([0, 0], [3, 0], [3, 3], [0, 0])] }], GRID)[0]
      expect(area(closed ?? new Float32Array())).toBeCloseTo(area(open ?? new Float32Array()), 9)
    })
  })

  describe('unmanaged errors', () => {
    it('finishes at once on an aberrant coordinate, filling only what lies on the grid', () => {
      // The year schema accepts any finite number; one vertex at 1e9 must not make a walk run for a
      // billion steps (session review SEC-001).
      const started = performance.now()
      const [fill] = fillTriangles([{ rings: [ring([1, 1], [1e9, 1], [1, 1e9])] }], GRID)
      expect(performance.now() - started).toBeLessThan(5000)
      // The hypotenuse runs far beyond the grid: what lies on it is x ≥ 1, y ≥ 1, a 7 × 7 square.
      expect(area(fill ?? new Float32Array())).toBeCloseTo(49, 6)
    })
  })

  describe('edge cases', () => {
    it('fills a large slanted polygon exactly, whole cells meeting cut ones along every edge', () => {
      const points: [number, number][] = [
        [0.3, 0.6],
        [7.7, 2.1],
        [5.2, 7.4],
      ]
      const [fill] = fillTriangles([{ rings: [ring(...points)] }], GRID)
      expect(area(fill ?? new Float32Array())).toBeCloseTo(shoelace(points), 6)
    })

    it('fills exactly a ring with a vertex on a row centre line and an edge through a cell centre', () => {
      // (2.5, 3.5) is a cell centre and lies on row 3's centre line; the edge from (0.5, 1.5) to
      // (6.5, 7.5) runs through the centres of a whole diagonal of cells.
      const points: [number, number][] = [
        [0.5, 1.5],
        [6.5, 7.5],
        [2.5, 3.5],
        [1.2, 6.8],
      ]
      const [fill] = fillTriangles([{ rings: [ring(...points)] }], GRID)
      expect(area(fill ?? new Float32Array())).toBeCloseTo(shoelace(points), 6)
    })

    it('cuts a polygon off at the edge of the grid', () => {
      const [fill] = fillTriangles([{ rings: [ring([6, 6], [10, 6], [10, 10], [6, 10])] }], GRID)
      expect(area(fill ?? new Float32Array())).toBeCloseTo(4, 6)
    })

    it('fills a polygon smaller than a cell', () => {
      const [fill] = fillTriangles([{ rings: [ring([3.2, 3.2], [3.4, 3.2], [3.3, 3.4])] }], GRID)
      expect(area(fill ?? new Float32Array())).toBeCloseTo(0.02, 6)
      expect(everyPieceOnOnePlane(fill ?? new Float32Array())).toBe(true)
    })

    it('fills a polygon flush with the far edge of the grid', () => {
      const [fill] = fillTriangles([{ rings: [ring([5, 5], [8, 5], [8, 8], [5, 8])] }], GRID)
      expect(area(fill ?? new Float32Array())).toBeCloseTo(9, 6)
    })

    it('fills nothing for a polygon wholly off the grid', () => {
      const [fill] = fillTriangles([{ rings: [ring([9, 9], [12, 9], [12, 12])] }], GRID)
      expect(fill?.length).toBe(0)
    })

    it('fills a polygon whose edges run along the grid lines', () => {
      const [fill] = fillTriangles([{ rings: [ring([2, 2], [5, 2], [5, 5], [2, 5])] }], GRID)
      expect(area(fill ?? new Float32Array())).toBeCloseTo(9, 6)
      expect(everyPieceOnOnePlane(fill ?? new Float32Array())).toBe(true)
    })
  })
})

describe('clipHalfPlane', () => {
  it('keeps the side where the expression is positive, cutting at the line', () => {
    // The unit square, cut by x ≤ 0.5 (−x + 0.5 ≥ 0).
    const out = clipHalfPlane([0, 0, 1, 0, 1, 1, 0, 1], -1, 0, 0.5)
    expect(Math.max(...out.filter((_, k) => k % 2 === 0))).toBeCloseTo(0.5, 9)
  })

  it('returns nothing when the polygon is wholly on the other side', () => {
    expect(clipHalfPlane([0, 0, 1, 0, 1, 1], 1, 0, -2)).toEqual([])
  })
})

describe('boundaryCells', () => {
  it('marks every cell an edge passes through, a steep diagonal included', () => {
    const cells = boundaryCells(edgesOf([[0.5, 0.5, 3.5, 2.5, 0.5, 2.5]]), GRID)
    // The long edge from (0.5, 0.5) to (3.5, 2.5) crosses cells (1, 0), (1, 1), (2, 1), (3, 2).
    for (const [x, y] of [
      [1, 0],
      [1, 1],
      [2, 1],
      [3, 2],
    ] as const)
      expect(cells.has(y * GRID.segX + x)).toBe(true)
    // …and none the triangle stays clear of.
    expect(cells.has(0 * GRID.segX + 6)).toBe(false)
    expect(cells.has(6 * GRID.segX + 1)).toBe(false)
  })
})

describe('clipEdgeToGrid', () => {
  it('keeps the part of an edge inside the grid and drops one that misses it', () => {
    expect(clipEdgeToGrid([-4, 4, 12, 4], GRID)).toEqual([0, 4, 8, 4])
    expect(clipEdgeToGrid([-4, -1, -1, -4], GRID)).toBeNull()
  })
})

const test = (rings: number[][]): ((x: number, y: number) => boolean) =>
  evenOddTest(edgesByRow(edgesOf(rings), GRID))

describe('evenOddTest', () => {
  it('says inside for one ring around the point and outside for two', () => {
    const square = [0, 0, 4, 0, 4, 4, 0, 4]
    const inner = [1, 1, 3, 1, 3, 3, 1, 3]
    expect(test([square])(2, 2)).toBe(true)
    expect(test([square, inner])(2, 2)).toBe(false)
    expect(test([square, inner])(0.5, 2)).toBe(true)
  })
})
