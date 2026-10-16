import { describe, expect, it } from 'vitest'

import { planeHeight, splitAtGrid } from './gridDrape'

import type { UvPair } from './gridDrape'

const GRID = { segX: 4, segY: 4 }

/** A height per node that no plane through three nodes fits by accident. */
const nodeY = (ix: number, iy: number): number => ((ix * 7 + iy * 13) % 5) + ix * iy * 0.3

/**
 * Whether a piece lies inside one triangle of the relief: its midpoint's cell and half hold both ends.
 * @param piece - the piece
 * @returns whether it does
 */
function insideOneTriangle([a, b]: UvPair): boolean {
  const mx = ((a.u + b.u) / 2) * GRID.segX
  const my = ((a.v + b.v) / 2) * GRID.segY
  const ix = Math.floor(mx)
  const iy = Math.floor(my)
  const lower = mx - ix + (my - iy) <= 1
  return [a, b].every(({ u, v }) => {
    const x = u * GRID.segX - ix
    const y = v * GRID.segY - iy
    const eps = 1e-9
    const inCell = x >= -eps && x <= 1 + eps && y >= -eps && y <= 1 + eps
    return inCell && (lower ? x + y <= 1 + eps : x + y >= 1 - eps)
  })
}

describe('splitAtGrid', () => {
  describe('happy path', () => {
    it('cuts a long segment into pieces that each lie in one triangle, end to end', () => {
      const segment: UvPair = [
        { u: 0.05, v: 0.1 },
        { u: 0.93, v: 0.71 },
      ]
      const pieces = splitAtGrid([segment], GRID)
      expect(pieces.length).toBeGreaterThan(4)
      expect(pieces[0]?.[0]).toBe(segment[0])
      expect(pieces.at(-1)?.[1]).toBe(segment[1])
      for (let i = 1; i < pieces.length; i++) expect(pieces[i]?.[0]).toBe(pieces[i - 1]?.[1])
      for (const piece of pieces) expect(insideOneTriangle(piece)).toBe(true)
    })

    it('lays the cut line on the relief: every piece end on the plane of the triangle it lies in', () => {
      // A chord between the two far ends would pass the midpoint at their average height; the pieces
      // follow the surface instead, so their heights are planeHeight at each cut.
      const pieces = splitAtGrid(
        [
          [
            { u: 0.1, v: 0.1 },
            { u: 0.9, v: 0.9 },
          ],
        ],
        GRID
      )
      // planeHeight is linear inside a triangle, so a piece in one triangle has its midpoint at the
      // average of its ends — the chord drawn between them lies on the surface along its whole length.
      for (const [a, b] of pieces) {
        const mid = planeHeight((a.u + b.u) / 2, (a.v + b.v) / 2, GRID, nodeY)
        const ends = (planeHeight(a.u, a.v, GRID, nodeY) + planeHeight(b.u, b.v, GRID, nodeY)) / 2
        expect(mid).toBeCloseTo(ends, 9)
      }
    })
  })

  describe('variants', () => {
    it('keeps a segment inside one triangle as it is', () => {
      const segment: UvPair = [
        { u: 0.02, v: 0.02 },
        { u: 0.05, v: 0.1 },
      ]
      expect(splitAtGrid([segment], GRID)).toEqual([segment])
    })

    it('cuts at the cell diagonal even inside one cell', () => {
      const pieces = splitAtGrid(
        [
          [
            { u: 0.02, v: 0.02 },
            { u: 0.23, v: 0.23 },
          ],
        ],
        GRID
      )
      expect(pieces).toHaveLength(2)
      const [, cut] = pieces[0] ?? []
      expect((cut?.u ?? 0) * 4 + (cut?.v ?? 0) * 4).toBeCloseTo(1, 9)
    })

    it('keeps each segment going the way it went, in order', () => {
      const back: UvPair = [
        { u: 0.9, v: 0.6 },
        { u: 0.1, v: 0.6 },
      ]
      const pieces = splitAtGrid([back], GRID)
      for (let i = 1; i < pieces.length; i++)
        expect(pieces[i]?.[0].u ?? 0).toBeLessThan(pieces[i - 1]?.[0].u ?? 0)
    })
  })

  // L3 (managed errors): N/A — any pair of points can be cut; nothing is refused.

  describe('unmanaged errors', () => {
    it('carries a NaN coordinate through as one piece rather than inventing cuts', () => {
      const segment: UvPair = [
        { u: Number.NaN, v: 0.1 },
        { u: 0.9, v: 0.9 },
      ]
      const pieces = splitAtGrid([segment], GRID)
      expect(pieces.at(-1)?.[1]).toBe(segment[1])
      expect(pieces.flat().some((p) => Number.isNaN(p.u))).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('leaves a zero-length segment alone', () => {
      const p = { u: 0.3, v: 0.3 }
      expect(splitAtGrid([[p, p]], GRID)).toEqual([[p, p]])
    })

    it('cuts once at a grid node where three lines meet, with no sliver', () => {
      // Through node (2, 2): x = 2, y = 2 and x + y = 4 all cross at the same point.
      const pieces = splitAtGrid(
        [
          [
            { u: 0.4, v: 0.45 },
            { u: 0.6, v: 0.55 },
          ],
        ],
        GRID
      )
      for (const [a, b] of pieces) expect(Math.hypot(b.u - a.u, b.v - a.v)).toBeGreaterThan(1e-6)
      for (const piece of pieces) expect(insideOneTriangle(piece)).toBe(true)
    })

    it('ends a segment that stops on a grid line without an empty piece', () => {
      const pieces = splitAtGrid(
        [
          [
            { u: 0.1, v: 0.1 },
            { u: 0.5, v: 0.1 },
          ],
        ],
        GRID
      )
      for (const [a, b] of pieces) expect(Math.hypot(b.u - a.u, b.v - a.v)).toBeGreaterThan(1e-6)
    })
  })
})

describe('planeHeight', () => {
  it('is the node height on a node', () => {
    expect(planeHeight(0.25, 0.5, GRID, nodeY)).toBeCloseTo(nodeY(1, 2), 9)
  })

  it('agrees on both sides of a cell diagonal', () => {
    // Cell (1, 1), diagonal x + y = 3 in grid units.
    const below = planeHeight((1.6 - 1e-9) / 4, 1.4 / 4, GRID, nodeY)
    const above = planeHeight((1.6 + 1e-9) / 4, 1.4 / 4, GRID, nodeY)
    expect(below).toBeCloseTo(above, 6)
  })

  it('carries a NaN height through', () => {
    expect(planeHeight(0.5, 0.5, GRID, () => Number.NaN)).toBeNaN()
  })

  it('clamps a point past the far edge onto the last node', () => {
    expect(planeHeight(1.3, 1.3, GRID, nodeY)).toBeCloseTo(nodeY(4, 4), 9)
  })
})
