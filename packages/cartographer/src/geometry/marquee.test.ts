import { describe, expect, it } from 'vitest'

import { normaliseRect, pointsInRect, rectContains } from './marquee'

import type { Point } from '../view/viewport'

/** Four anchors in a square, so each direction of drag has something to catch. */
const SQUARE: Point[] = [
  [10, 10],
  [90, 10],
  [90, 90],
  [10, 90],
]

describe('marquee', () => {
  describe('happy path', () => {
    it('spans the rectangle between two corners', () => {
      expect(normaliseRect([10, 20], [110, 220])).toEqual({ x: 10, y: 20, width: 100, height: 200 })
    })

    it('catches the anchors inside it', () => {
      const rect = normaliseRect([0, 0], [95, 50])

      expect(pointsInRect(SQUARE, rect)).toEqual([0, 1])
    })

    it('says whether a point is inside', () => {
      const rect = { x: 0, y: 0, width: 10, height: 10 }

      expect(rectContains(rect, [5, 5])).toBe(true)
      expect(rectContains(rect, [15, 5])).toBe(false)
    })
  })

  describe('variants', () => {
    it('normalises a drag in each of the four directions to the same rectangle', () => {
      const expected = { x: 10, y: 20, width: 100, height: 200 }

      expect(normaliseRect([10, 20], [110, 220])).toEqual(expected)
      expect(normaliseRect([110, 220], [10, 20])).toEqual(expected)
      expect(normaliseRect([110, 20], [10, 220])).toEqual(expected)
      expect(normaliseRect([10, 220], [110, 20])).toEqual(expected)
    })

    it('catches the same anchors whichever way the band was dragged', () => {
      const downRight = pointsInRect(SQUARE, normaliseRect([0, 0], [95, 50]))
      const upLeft = pointsInRect(SQUARE, normaliseRect([95, 50], [0, 0]))

      expect(upLeft).toEqual(downRight)
      expect(upLeft).toEqual([0, 1])
    })

    it('catches every anchor when the band covers them all', () => {
      expect(pointsInRect(SQUARE, normaliseRect([0, 0], [100, 100]))).toEqual([0, 1, 2, 3])
    })

    it('returns the indices in anchor order, not in the order they were found', () => {
      expect(pointsInRect(SQUARE, normaliseRect([100, 100], [0, 0]))).toEqual([0, 1, 2, 3])
    })
  })

  describe('managed errors', () => {
    it('catches nothing when the band covers nothing', () => {
      expect(pointsInRect(SQUARE, normaliseRect([200, 200], [300, 300]))).toEqual([])
    })

    it('catches nothing in an empty set', () => {
      expect(pointsInRect([], normaliseRect([0, 0], [100, 100]))).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A for async — nothing here awaits or catches. What follows is the non-finite case.
    it('catches nothing through a band that is not a rectangle', () => {
      const broken = normaliseRect([Number.NaN, 0], [100, 100])

      expect(pointsInRect(SQUARE, broken)).toEqual([])
    })

    it('ignores an anchor that is not a position', () => {
      const points: Point[] = [
        [Number.NaN, 50],
        [50, 50],
      ]

      expect(pointsInRect(points, normaliseRect([0, 0], [100, 100]))).toEqual([1])
    })
  })

  describe('edge cases', () => {
    it('catches an anchor exactly on the edge, the band having been drawn through it', () => {
      const rect = normaliseRect([10, 10], [90, 90])

      expect(pointsInRect(SQUARE, rect)).toEqual([0, 1, 2, 3])
    })

    it('treats a click without movement as a band of no size, catching only what is under it', () => {
      const rect = normaliseRect([10, 10], [10, 10])

      expect(rect).toEqual({ x: 10, y: 10, width: 0, height: 0 })
      expect(pointsInRect(SQUARE, rect)).toEqual([0])
    })

    it('never produces a negative extent, whatever it is handed', () => {
      for (const [from, to] of [
        [
          [0, 0],
          [-50, -50],
        ],
        [
          [-50, -50],
          [0, 0],
        ],
        [
          [0, -50],
          [-50, 0],
        ],
      ] as [Point, Point][]) {
        const rect = normaliseRect(from, to)

        expect(rect.width).toBeGreaterThanOrEqual(0)
        expect(rect.height).toBeGreaterThanOrEqual(0)
      }
    })
  })
})
