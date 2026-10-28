import { describe, expect, it } from 'vitest'

import { fittingOf, horizontalFit, lineLength, pointAlong, ridgeFit } from './nameFit'
import { ownerPieces } from './nameSpace'

import type { Fitting } from './nameFit'
import type { NameLine } from './nameLine'

/** A straight line from (0, 0) to (4, 0), sampled every unit. */
const STRAIGHT: NameLine = {
  points: [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ],
  lengths: [0, 1, 2, 3, 4],
}

/**
 * The fitting of a band of one owner, `width` by `height` cells.
 * @param width - columns
 * @param height - rows
 * @returns the band's fitting
 */
function band(width: number, height: number): Fitting {
  const space = ownerPieces(new Int32Array(width * height), width, height).get(0)?.[0]
  if (space === undefined) throw new Error('no band')
  return fittingOf(space)
}

describe('pointAlong', () => {
  describe('happy path', () => {
    it('reaches the point a length along the line, with its direction', () => {
      expect(pointAlong(STRAIGHT, 2.5)).toEqual({ x: 2.5, y: 0, angle: 0 })
    })
  })

  describe('variants', () => {
    it('reads a falling segment’s direction downward', () => {
      const falling: NameLine = {
        points: [
          [0, 0],
          [0, 1],
        ],
        lengths: [0, 1],
      }
      expect(pointAlong(falling, 0.5).angle).toBeCloseTo(Math.PI / 2, 9)
    })
  })

  describe('managed errors', () => {
    it('refuses a line with fewer points than lengths, a line built wrong', () => {
      const broken: NameLine = { points: [[0, 0]], lengths: [0, 1] }
      expect(() => pointAlong(broken, 0.5)).toThrow(/has none at 0/)
    })
  })

  // L4: N/A — pure arithmetic over a line it checks.

  describe('edge cases', () => {
    it('holds a length past either end at that end', () => {
      expect([pointAlong(STRAIGHT, -1).x, pointAlong(STRAIGHT, 9).x]).toEqual([0, 4])
    })
  })
})

describe('horizontalFit', () => {
  describe('happy path', () => {
    it('lays a short name straight across a band, its size bounded by the band’s height', () => {
      const { line, size } = horizontalFit(band(60, 12), { length: 6, height: 1 }, 1)
      expect(line.points.every(([, y]) => y === line.points[0]?.[1])).toBe(true)
      // 12 rows less a margin each side, less what reading at the cells' centres costs.
      expect(size).toBeGreaterThan(8.5)
      expect(size).toBeLessThanOrEqual(10)
    })
  })

  describe('variants', () => {
    it('bounds a long name’s size by the line’s length', () => {
      const { line, size } = horizontalFit(band(60, 12), { length: 30, height: 1 }, 1)
      expect(size * 30).toBeLessThanOrEqual(lineLength(line))
    })

    it('fits a block twice as tall at about half the size', () => {
      const one = horizontalFit(band(60, 12), { length: 4, height: 1 }, 1).size
      const two = horizontalFit(band(60, 12), { length: 4, height: 2 }, 1).size
      expect(two).toBeCloseTo(one / 2, 0)
    })
  })

  describe('managed errors', () => {
    it('gives no size where the margin leaves no room', () => {
      expect(horizontalFit(band(30, 2), { length: 2, height: 1 }, 1).size).toBe(0)
    })
  })

  // L4: N/A — `namePlacement` checks the measure before asking.

  describe('edge cases', () => {
    it('fits a name in a space of one cell at no margin, smaller than the cell', () => {
      const { size } = horizontalFit(band(1, 1), { length: 1, height: 1 }, 0)
      expect(size).toBeGreaterThan(0)
      expect(size).toBeLessThan(1)
    })
  })
})

describe('ridgeFit', () => {
  describe('happy path', () => {
    it('writes a long name along a standing band, reading upward, larger than straight across', () => {
      const column = band(12, 80)
      const extent = { length: 12, height: 1 }
      const along = ridgeFit(column, extent, 1)
      if (along === null) throw new Error('no ridge')
      const first = along.line.points[0]
      const last = along.line.points[along.line.points.length - 1]
      expect(first?.[1] ?? Number.NaN).toBeGreaterThan(last?.[1] ?? Number.NaN)
      expect(along.size).toBeGreaterThan(horizontalFit(column, extent, 1).size * 3)
    })
  })

  // L2: the thicknesses tried are `nameLine`'s, asserted there.

  describe('managed errors', () => {
    it('gives no ridge in a space of one cell, which gives no direction', () => {
      expect(ridgeFit(band(1, 1), { length: 1, height: 1 }, 0)).toBeNull()
    })
  })

  // L4: N/A — `namePlacement` checks the measure before asking.
  // L5: a ridge with no room for the margin is `horizontalFit`'s case, sized `0` by the same search.
})
