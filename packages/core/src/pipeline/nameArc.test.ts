import { describe, expect, it } from 'vitest'

import { axisArc, centredOn, spaceLength, spaceShape } from './nameArc'

import type { NameLine } from './nameLine'

/**
 * A mask from a predicate over its cells.
 * @param width - columns
 * @param height - rows
 * @param inside - whether a cell is inside
 * @returns the mask, row-major
 */
function maskOf(
  width: number,
  height: number,
  inside: (x: number, y: number) => boolean
): Uint8Array {
  const mask = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) mask[y * width + x] = inside(x, y) ? 1 : 0
  return mask
}

/**
 * Both ends of a line.
 * @param line - the line
 * @returns its first and last points
 */
function ends(line: NameLine | null): [readonly [number, number], readonly [number, number]] {
  const first = line?.points[0]
  const last = line?.points[(line.points.length || 1) - 1]
  if (first === undefined || last === undefined) throw new Error('no line')
  return [first, last]
}

/** A band 60 cells long and 8 high. */
const BAND = maskOf(62, 10, (x, y) => x >= 1 && x <= 60 && y >= 1 && y <= 8)

describe('axisArc', () => {
  describe('happy path', () => {
    it('runs along a band’s length through its middle, west to east', () => {
      const [first, last] = ends(axisArc(BAND, 62))
      expect(first[0]).toBeLessThan(5)
      expect(last[0]).toBeGreaterThan(56)
      expect(Math.abs(first[1] - 4.5)).toBeLessThan(0.5)
      expect(Math.abs(last[1] - 4.5)).toBeLessThan(0.5)
    })
  })

  describe('variants', () => {
    it('runs up a standing band, from the bottom', () => {
      const column = maskOf(10, 62, (x, y) => x >= 1 && x <= 8 && y >= 1 && y <= 60)
      const [first, last] = ends(axisArc(column, 10))
      expect(first[1]).toBeGreaterThan(last[1])
    })

    it('bends with an arched band, its middle above its ends', () => {
      const arch = maskOf(90, 60, (x, y) => {
        const r = Math.hypot(x - 45, y - 110)
        return r >= 70 && r <= 84
      })
      const line = axisArc(arch, 90)
      const [first, last] = ends(line)
      const middle = line?.points[Math.floor(line.points.length / 2)] ?? [Number.NaN, Number.NaN]
      expect(middle[1]).toBeLessThan(Math.min(first[1], last[1]))
    })

    it('is cut evenly about the point nearest the centre of mass', () => {
      // A band with a block below its west end: the mass leans west, the arc is cut short to the east.
      const leaning = maskOf(60, 16, (x, y) => y < 8 || x < 20)
      const [first, last] = ends(axisArc(leaning, 60))
      const centre = spaceShape(leaning, 60).centre
      expect(Math.abs((first[0] + last[0]) / 2 - centre[0])).toBeLessThan(1)
    })
  })

  describe('managed errors', () => {
    it('gives no arc for a space of one cell', () => {
      expect(
        axisArc(
          maskOf(3, 3, (x, y) => x === 1 && y === 1),
          3
        )
      ).toBeNull()
    })
  })

  // L4: N/A — arithmetic over a mask `nameSpace` built.

  describe('edge cases', () => {
    it('gives no arc for an empty space', () => {
      expect(axisArc(new Uint8Array(9), 3)).toBeNull()
    })
  })
})

describe('centredOn', () => {
  it('cuts a line evenly about its point nearest a place', () => {
    const line: NameLine = {
      points: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
      ],
      lengths: [0, 1, 2, 3, 4],
    }
    expect(centredOn(line, 1, 0)).toEqual({
      points: [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      lengths: [0, 1, 2],
    })
  })
})

describe('spaceShape', () => {
  it('gives a band’s centre, its length along its axis, and the radius of a disc of its area', () => {
    const { centre, length, reach } = spaceShape(BAND, 62)
    expect(centre[0]).toBeCloseTo(30.5, 6)
    expect(centre[1]).toBeCloseTo(4.5, 6)
    expect(length).toBeCloseTo(60, 6)
    expect(reach).toBeCloseTo(Math.sqrt(480 / Math.PI), 6)
    expect(spaceLength(BAND, 62)).toBeCloseTo(60, 6)
  })
})
