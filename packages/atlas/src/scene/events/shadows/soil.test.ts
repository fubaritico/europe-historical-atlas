import { describe, expect, it } from 'vitest'

import { blotch, grain, soiled } from './soil'

/** A grid of 40 × 40, a square of 8 × 8 filled at its middle. */
const SIZE = 40
const FOOTPRINT = new Float32Array(SIZE * SIZE)
for (let y = 16; y < 24; y++) for (let x = 16; x < 24; x++) FOOTPRINT[y * SIZE + x] = 1

/** No cast shadow at all. */
const NONE = new Float32Array(SIZE * SIZE)

/** The value at a pixel. */
const at = (grid: Float32Array, x: number, y: number): number => grid[y * SIZE + x] ?? Number.NaN

describe('soiled', () => {
  describe('happy path', () => {
    it('darkens the ground past the walls, and less the further from them', () => {
      const out = soiled(NONE, FOOTPRINT, SIZE, SIZE, { darkness: 1, spread: 4 })

      // Just outside the square, then further, then well past the spread.
      expect(at(out, 25, 20)).toBeGreaterThan(0)
      const even = (x: number): number => at(out, x, 20) / (blotch(x, 20) * grain(x, 20))
      expect(even(25)).toBeGreaterThan(even(29))
      expect(at(out, 38, 20)).toBeLessThan(0.01)
    })
  })

  describe('variants', () => {
    it('keeps the cast shadow where it is the darker', () => {
      const cast = new Float32Array(SIZE * SIZE).fill(0.9)

      const out = soiled(cast, FOOTPRINT, SIZE, SIZE, { darkness: 0.5, spread: 4 })

      expect(at(out, 25, 20)).toBeCloseTo(0.9)
      expect(at(out, 2, 2)).toBeCloseTo(0.9)
    })

    it('is never darker than its darkness', () => {
      const out = soiled(NONE, FOOTPRINT, SIZE, SIZE, { darkness: 0.6, spread: 4 })

      expect(Math.max(...out)).toBeLessThanOrEqual(0.6)
    })
  })

  describe('edge cases', () => {
    it('lays nothing with no darkness', () => {
      const out = soiled(NONE, FOOTPRINT, SIZE, SIZE, { darkness: 0, spread: 4 })

      expect(Math.max(...out)).toBe(0)
    })
  })

  // L3: N/A — arithmetic over a grid; nothing is refused
  // L4: N/A — no async work, nothing external
})

describe('blotch', () => {
  it('is uneven from place to place, the same at every drawing, and never under half', () => {
    const values = [blotch(3, 4), blotch(40, 4), blotch(3, 70), blotch(90, 90)]

    expect(new Set(values).size).toBeGreaterThan(1)
    expect(blotch(3, 4)).toBe(values[0])
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0.5)
      expect(value).toBeLessThanOrEqual(1)
    }
  })
})

describe('grain', () => {
  it('differs from one grain to the next, is the same at every drawing, and never under its floor', () => {
    const values = [grain(0, 0), grain(2, 0), grain(0, 2), grain(31, 17)]

    expect(new Set(values).size).toBeGreaterThan(2)
    expect(grain(31, 17)).toBe(values[3])
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0.45)
      expect(value).toBeLessThanOrEqual(1)
    }
  })
})
