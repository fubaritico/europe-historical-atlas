import { describe, expect, it } from 'vitest'

import { distanceToOutside } from './distanceTransform'

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
 * The distance by brute force: every outside cell's centre, the nearest kept.
 * @param mask - the mask
 * @param width - columns
 * @returns each cell's distance to the nearest outside cell
 */
function bruteForce(mask: Uint8Array, width: number): number[] {
  const outside: [number, number][] = []
  mask.forEach((value, at) => {
    if (value === 0) outside.push([at % width, Math.floor(at / width)])
  })
  return Array.from(mask, (_, at) => {
    const x = at % width
    const y = Math.floor(at / width)
    return Math.min(...outside.map(([ox, oy]) => Math.hypot(x - ox, y - oy)))
  })
}

describe('distanceToOutside', () => {
  describe('happy path', () => {
    it('measures a single inside cell as one cell from the outside', () => {
      const distances = distanceToOutside(
        maskOf(3, 3, (x, y) => x === 1 && y === 1),
        3,
        3
      )
      expect(Array.from(distances)).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0])
    })

    it('measures the middle of a band by its nearer side', () => {
      // Rows 1 to 3 inside: row 2 is two rows from row 0 and from row 4.
      const distances = distanceToOutside(
        maskOf(9, 5, (x, y) => x > 0 && x < 8 && y > 0 && y < 4),
        9,
        5
      )
      expect(distances[2 * 9 + 4]).toBe(2)
    })
  })

  describe('variants', () => {
    it('is exact along diagonals, as the brute force over every outside cell', () => {
      const width = 31
      const disc = maskOf(width, 31, (x, y) => Math.hypot(x - 15, y - 15) < 12)
      const expected = bruteForce(disc, width)
      Array.from(distanceToOutside(disc, width, 31)).forEach((distance, at) => {
        expect(distance).toBeCloseTo(expected[at] ?? Number.NaN, 4)
      })
    })

    it('is exact on a shape with a hole and a notch', () => {
      const width = 24
      const shape = maskOf(
        width,
        18,
        (x, y) =>
          x > 1 &&
          x < 22 &&
          y > 1 &&
          y < 16 &&
          !(x > 9 && x < 13 && y > 6 && y < 10) &&
          !(x > 17 && y < 6)
      )
      const expected = bruteForce(shape, width)
      Array.from(distanceToOutside(shape, width, 18)).forEach((distance, at) => {
        expect(distance).toBeCloseTo(expected[at] ?? Number.NaN, 4)
      })
    })
  })

  describe('managed errors', () => {
    it('refuses a mask whose size is not width × height', () => {
      expect(() => distanceToOutside(new Uint8Array(5), 2, 3)).toThrow(/is not 2 × 3/)
    })

    it('refuses a mask with no outside cell', () => {
      expect(() => distanceToOutside(new Uint8Array([1, 1, 1, 1]), 2, 2)).toThrow(/no outside cell/)
    })
  })

  // L4: N/A — synchronous arithmetic over arrays it checks; nothing else can fail.

  describe('edge cases', () => {
    it('reads a lone outside cell as zero', () => {
      expect(Array.from(distanceToOutside(new Uint8Array([0]), 1, 1))).toEqual([0])
    })

    it('does not count the grid frame as outside: an inside cell on the edge is measured to the nearest 0', () => {
      // Only column 2 is outside; column 0 lies on the frame and is two cells from it.
      const distances = distanceToOutside(
        maskOf(3, 1, (x) => x < 2),
        3,
        1
      )
      expect(Array.from(distances)).toEqual([2, 1, 0])
    })
  })
})
