import { describe, expect, it } from 'vitest'

import { distanceToOutside } from '../geo/distanceTransform'

import {
  MAX_BEND,
  centreOfMass,
  extendLine,
  horizontalLine,
  innermostCell,
  ridgeLine,
} from './nameLine'

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
    it('centres the line on the space’s centre of mass, as far as the nearer end of its run', () => {
      // A band with a block below its west end: the mass leans west, and the line is cut evenly about it.
      const leaning = cropOf(
        62,
        16,
        (x, y) => (x >= 1 && x <= 60 && y >= 1 && y <= 8) || (x >= 1 && x <= 20 && y > 8 && y <= 14)
      )
      const centre = centreOfMass(leaning.mask, leaning.width)
      if (centre === null) throw new Error('no centre')
      const { first, last } = ends(horizontalLine(leaning.mask, leaning.distances, leaning.width))
      expect(centre.x).toBeLessThan(30)
      expect((first[0] + last[0]) / 2).toBeCloseTo(centre.x, 6)
      expect(first[0]).toBe(0.5)
    })

    it('falls back to the most inner cell when the centre of mass lies outside the space', () => {
      // Two blocks apart: the mass is in the gap between them.
      const apart = cropOf(
        30,
        10,
        (x, y) => y >= 1 && y <= 8 && ((x >= 1 && x <= 10) || (x >= 19 && x <= 28))
      )
      expect(centreOfMass(apart.mask, apart.width)).toBeNull()
      const { first, last } = ends(horizontalLine(apart.mask, apart.distances, apart.width))
      expect([first[0], last[0]]).toEqual([0.5, 10.5])
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

describe('extendLine', () => {
  /** A straight line from (10, 5) to (14, 5), a point every unit. */
  const straight: NameLine = {
    points: [
      [10, 5],
      [11, 5],
      [12, 5],
      [13, 5],
      [14, 5],
    ],
    lengths: [0, 1, 2, 3, 4],
  }

  describe('happy path', () => {
    it('carries a straight line on past both ends, by as much each side', () => {
      const longer = extendLine(straight, 2)
      expect(ends(longer)).toEqual({ first: [8, 5], last: [16, 5] })
      expect(longer.lengths[longer.lengths.length - 1]).toBeCloseTo(8, 9)
    })
  })

  describe('variants', () => {
    it('carries each end along its own last step, a bent line bent no further', () => {
      const bent: NameLine = {
        points: [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
        lengths: [0, 1, 2],
      }
      expect(ends(extendLine(bent, 1))).toEqual({ first: [-1, 0], last: [1, 2] })
    })

    it('keeps the points it adds no further apart than a line’s own', () => {
      const longer = extendLine(straight, 3)
      const steps = longer.lengths.slice(1).map((length, at) => length - (longer.lengths[at] ?? 0))
      expect(Math.max(...steps)).toBeLessThanOrEqual(1)
      expect(Math.max(...steps.slice(0, 6))).toBeLessThanOrEqual(0.5)
    })
  })

  describe('managed errors', () => {
    it('refuses a line with two points on each other at an end', () => {
      const stuck: NameLine = {
        points: [
          [0, 0],
          [0, 0],
          [1, 0],
        ],
        lengths: [0, 0, 1],
      }
      expect(() => extendLine(stuck, 1)).toThrow(/two points on each other/)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a line of one point, which has no direction to carry on', () => {
      expect(() => extendLine({ points: [[0, 0]], lengths: [0] }, 1)).toThrow(
        /cannot be carried on/
      )
    })
  })

  describe('edge cases', () => {
    it('leaves the line as it is when carried on by nothing', () => {
      expect(extendLine(straight, 0)).toBe(straight)
    })
  })
})
