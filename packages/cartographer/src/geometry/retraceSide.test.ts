import { describe, expect, it } from 'vitest'

import { closerSide, lineGap } from './retraceSide'

import type { Point } from '../view/viewport'

/** A square's two halves between its corners (0,0) and (10,10): over the top-right, or the bottom-left. */
const OVER_TOP: Point[] = [
  [0, 0],
  [10, 0],
  [10, 10],
]
const UNDER: Point[] = [
  [0, 0],
  [0, 10],
  [10, 10],
]

describe('retraceSide', () => {
  describe('happy path', () => {
    it('replaces the side the new run lies closer to', () => {
      const run: Point[] = [
        [0, 0],
        [8, 1],
        [10, 10],
      ]
      expect(closerSide(run, OVER_TOP, UNDER)).toBe('forward')
      expect(closerSide(run, UNDER, OVER_TOP)).toBe('backward')
    })
  })

  describe('variants', () => {
    // Defect 14 of the general test: the shorter side is not the one the author draws over.
    it('takes the longer side when the run lies along it', () => {
      const short: Point[] = [
        [0, 0],
        [10, 0],
      ]
      const long: Point[] = [
        [0, 0],
        [0, 20],
        [10, 20],
        [10, 0],
      ]
      const run: Point[] = [
        [0, 0],
        [1, 19],
        [9, 19],
        [10, 0],
      ]
      expect(closerSide(run, short, long)).toBe('backward')
    })

    it('measures the gap both ways, so a far stretch scores far even under a short run', () => {
      expect(lineGap(OVER_TOP, OVER_TOP)).toBe(0)
      expect(lineGap(OVER_TOP, UNDER)).toBeGreaterThan(0)
      expect(lineGap(OVER_TOP, UNDER)).toBe(lineGap(UNDER, OVER_TOP))
    })
  })

  // L3: N/A — pure arithmetic, nothing refused.

  describe('unmanaged errors', () => {
    it('reads two empty lines as no gap, and an empty one as infinitely far from points', () => {
      expect(lineGap([], [])).toBe(0)
      expect(lineGap([[0, 0]], [])).toBe(Infinity)
    })
  })

  describe('edge cases', () => {
    // Two mirror sides of as many points: an exact tie, settled the same way every time.
    it('breaks an exact tie between sides of as many points towards the forward one', () => {
      const straight: Point[] = [
        [0, 0],
        [10, 0],
      ]
      const above: Point[] = [
        [0, 0],
        [5, 1],
        [10, 0],
      ]
      const below: Point[] = [
        [0, 0],
        [5, -1],
        [10, 0],
      ]
      expect(closerSide(straight, above, below)).toBe('forward')
      expect(closerSide(straight, below, above)).toBe('forward')
    })

    it('measures a one-point line by its point', () => {
      expect(lineGap([[3, 4]], [[0, 0]])).toBe(5)
    })
  })
})
