import { describe, expect, it } from 'vitest'

import { enclosedArea, smallerSide } from './retraceSide'

import type { Point } from '../viewport/viewport'

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
    it('replaces the side whose change is the smaller — a correction along it', () => {
      const run: Point[] = [
        [0, 0],
        [8, 1],
        [10, 10],
      ]
      expect(smallerSide(run, OVER_TOP, UNDER)).toBe('forward')
      expect(smallerSide(run, UNDER, OVER_TOP)).toBe('backward')
    })
  })

  describe('variants', () => {
    // The Duchy of the Rana, 2026-10-14: an island joined to the mainland by two adjacent anchors, the run
    // adding the mainland and hugging the island near the join. The nearer side — the first rule, which
    // these points make fail — was the island; the smaller change is the join.
    it('adds ground by replacing the short join, not the island the run passes close to', () => {
      const join: Point[] = [
        [0, 0],
        [10, 0],
      ]
      const island: Point[] = [
        [0, 0],
        [-5, -8],
        [5, -20],
        [15, -8],
        [10, 0],
      ]
      const mainland: Point[] = [
        [0, 0],
        [-100, 1],
        [-100, 60],
        [110, 60],
        [110, 1],
        [10, 0],
      ]
      expect(smallerSide(mainland, join, island)).toBe('forward')
      expect(smallerSide(mainland, island, join)).toBe('backward')
    })

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
      expect(smallerSide(run, short, long)).toBe('backward')
    })

    it('measures the ground between a run and a stretch, whichever way they wind', () => {
      const run: Point[] = [
        [0, 0],
        [0, 10],
        [10, 10],
      ]
      expect(enclosedArea(run, OVER_TOP)).toBe(100)
      expect(enclosedArea([...run].reverse(), [...OVER_TOP].reverse())).toBe(100)
    })
  })

  // L3: N/A — pure arithmetic, nothing refused.

  describe('unmanaged errors', () => {
    it('reads an empty run and stretch as enclosing nothing', () => {
      expect(enclosedArea([], [])).toBe(0)
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
      expect(smallerSide(straight, above, below)).toBe('forward')
      expect(smallerSide(straight, below, above)).toBe('forward')
    })

    it('reads a run laid over the stretch itself as no change at all', () => {
      expect(enclosedArea(OVER_TOP, OVER_TOP)).toBe(0)
    })
  })
})
