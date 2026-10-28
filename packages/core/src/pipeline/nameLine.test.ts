import { describe, expect, it } from 'vitest'

import { distanceToOutside } from '../geo/distanceTransform'

import { MAX_BEND, horizontalLine, innermostCell, ridgeLine } from './nameLine'

import type { NameLine } from './nameLine'

/** A crop as `nameSpace` gives it: a mask with outside cells around, and its distances. */
interface Crop {
  readonly mask: Uint8Array
  readonly distances: Float32Array
  readonly width: number
  readonly height: number
}

/**
 * A crop from a predicate; the caller keeps the first and last rows and columns outside.
 * @param width - columns
 * @param height - rows
 * @param inside - whether a cell is inside
 * @returns the crop and its distances
 */
function cropOf(width: number, height: number, inside: (x: number, y: number) => boolean): Crop {
  const mask = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) mask[y * width + x] = inside(x, y) ? 1 : 0
  return { mask, distances: distanceToOutside(mask, width, height), width, height }
}

/**
 * The first and last points of a line.
 * @param line - the line
 * @returns both ends
 */
function ends(line: NameLine): {
  first: readonly [number, number]
  last: readonly [number, number]
} {
  const first = line.points[0]
  const last = line.points[line.points.length - 1]
  if (first === undefined || last === undefined) throw new Error('an empty line')
  return { first, last }
}

/**
 * The direction of a line between two of its points.
 * @param line - the line
 * @param from - one point's index
 * @param to - the other's
 * @returns the angle, radians
 */
function heading(line: NameLine, from: number, to: number): number {
  const a = line.points[from] ?? [Number.NaN, Number.NaN]
  const b = line.points[to] ?? [Number.NaN, Number.NaN]
  return Math.atan2(b[1] - a[1], b[0] - a[0])
}

/** A band 60 cells long, 8 high, in a crop with a ring of outside cells. */
const BAND = cropOf(62, 10, (x, y) => x >= 1 && x <= 60 && y >= 1 && y <= 8)

/** The same band standing up. */
const COLUMN = cropOf(10, 62, (x, y) => x >= 1 && x <= 8 && y >= 1 && y <= 60)

/** An arch — the upper half of a ring, 8 cells thick, open downward. */
const ARCH = cropOf(64, 36, (x, y) => {
  const r = Math.hypot(x - 32, y - 33)
  return r >= 22 && r <= 30 && y <= 33
})

describe('innermostCell', () => {
  it('finds the cell farthest from the outside, the first on a tie', () => {
    expect(innermostCell(Float32Array.from([0, 2, 3, 3, 1]))).toBe(2)
  })
})

describe('horizontalLine', () => {
  describe('happy path', () => {
    it('crosses the run of the most inner row, edge to edge', () => {
      const line = horizontalLine(BAND.mask, BAND.distances, BAND.width)
      const { first, last } = ends(line)
      expect(first[0]).toBe(0.5)
      expect(last[0]).toBe(60.5)
      expect(first[1]).toBe(last[1])
      expect(line.lengths[line.lengths.length - 1]).toBeCloseTo(60, 6)
    })
  })

  describe('variants', () => {
    it('stops at the first outside cell on its row, not at the crop’s edge', () => {
      // A notch at column 30 of every row: the most inner cell, found first, lies west of it.
      const notched = cropOf(62, 10, (x, y) => x >= 1 && x <= 60 && y >= 1 && y <= 8 && x !== 30)
      const { last } = ends(horizontalLine(notched.mask, notched.distances, notched.width))
      expect(last[0]).toBe(29.5)
    })
  })

  // L3, L4: N/A — it takes a crop `nameSpace` built and refuses nothing.

  describe('edge cases', () => {
    it('spans a single inside cell from one of its edges to the other', () => {
      const dot = cropOf(3, 3, (x, y) => x === 1 && y === 1)
      const { first, last } = ends(horizontalLine(dot.mask, dot.distances, dot.width))
      expect([first, last]).toEqual([
        [0.5, 1],
        [1.5, 1],
      ])
    })
  })
})

describe('ridgeLine', () => {
  describe('happy path', () => {
    it('runs along a band, west to east', () => {
      const line = ridgeLine(BAND.distances, BAND.width, BAND.height, 2)
      if (line === null) throw new Error('no line')
      const { first, last } = ends(line)
      expect(first[0]).toBeLessThan(10)
      expect(last[0]).toBeGreaterThan(51)
      expect(Math.abs(heading(line, 0, line.points.length - 1))).toBeLessThan(0.05)
    })
  })

  describe('variants', () => {
    it('reads a band standing up from the bottom to the top', () => {
      const line = ridgeLine(COLUMN.distances, COLUMN.width, COLUMN.height, 2)
      if (line === null) throw new Error('no line')
      const { first, last } = ends(line)
      expect(first[1]).toBeGreaterThan(last[1])
    })

    it('bends with an arch, its middle above its ends', () => {
      const line = ridgeLine(ARCH.distances, ARCH.width, ARCH.height, 2)
      if (line === null) throw new Error('no line')
      const { first, last } = ends(line)
      const middle = line.points[Math.floor(line.points.length / 2)] ?? [Number.NaN, Number.NaN]
      expect(first[0]).toBeLessThan(last[0])
      expect(middle[1]).toBeLessThan(Math.min(first[1], last[1]) - 2)
    })

    it('turns no more than MAX_BEND from one end to the other, however much the space turns', () => {
      // The arch turns 180°; its line is straightened to 60°.
      const line = ridgeLine(ARCH.distances, ARCH.width, ARCH.height, 2)
      if (line === null) throw new Error('no line')
      const n = line.points.length
      const turn = Math.abs(heading(line, n - 2, n - 1) - heading(line, 0, 1))
      expect(turn).toBeLessThanOrEqual(MAX_BEND + 1e-6)
      expect(turn).toBeGreaterThan(MAX_BEND * 0.9)
    })
  })

  describe('managed errors', () => {
    it('has no line when even the most inner cell is under the threshold', () => {
      expect(ridgeLine(BAND.distances, BAND.width, BAND.height, 5)).toBeNull()
    })
  })

  // L4: N/A — synchronous arithmetic over a crop `nameSpace` built.

  describe('edge cases', () => {
    it('runs straight through a space of two cells, which cannot tell a bend', () => {
      const pair = cropOf(4, 3, (x, y) => (x === 1 || x === 2) && y === 1)
      const line = ridgeLine(pair.distances, 4, 3, 1)
      if (line === null) throw new Error('no line')
      expect(line.points.every(([, y]) => Math.abs(y - 1) < 1e-9)).toBe(true)
      expect(ends(line).first[0]).toBeCloseTo(0.5, 9)
      expect(ends(line).last[0]).toBeCloseTo(2.5, 9)
    })

    it('has no line through a single cell, which gives no direction', () => {
      const dot = cropOf(3, 3, (x, y) => x === 1 && y === 1)
      expect(ridgeLine(dot.distances, 3, 3, 1)).toBeNull()
    })
  })
})
