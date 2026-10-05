import { describe, expect, it } from 'vitest'

import { distanceSquared, nearestPoint, squaredRadius } from './hitTest'

import type { Point } from '../view/viewport'

/** The handle radius `s02` names: "about 8 screen pixels across, at any zoom". */
const RADIUS = 8

describe('hitTest', () => {
  describe('happy path', () => {
    it('measures a squared distance without taking a root', () => {
      expect(distanceSquared([0, 0], [3, 4])).toBe(25)
      expect(distanceSquared([10, 10], [10, 10])).toBe(0)
    })

    it('turns a radius into a limit, and refuses one that is not a distance', () => {
      expect(squaredRadius(8)).toBe(64)
      expect(squaredRadius(0)).toBe(0)
      expect(squaredRadius(-8)).toBe(-1)
      expect(squaredRadius(Number.NaN)).toBe(-1)
      expect(squaredRadius(Infinity)).toBe(Infinity)
    })

    it('catches the anchor under the pointer', () => {
      const points: Point[] = [
        [100, 100],
        [200, 200],
      ]

      expect(nearestPoint(points, [202, 198], RADIUS)).toBe(1)
    })

    it('answers nothing when the pointer is over empty canvas', () => {
      expect(nearestPoint([[100, 100]], [400, 400], RADIUS)).toBeNull()
    })
  })

  describe('variants', () => {
    it('returns an index into the array handed in, which is the anchor index', () => {
      const points: Point[] = [
        [0, 0],
        [50, 0],
        [100, 0],
        [150, 0],
      ]

      expect(nearestPoint(points, [100, 2], RADIUS)).toBe(2)
      expect(nearestPoint(points, [0, 0], RADIUS)).toBe(0)
      expect(nearestPoint(points, [150, -3], RADIUS)).toBe(3)
    })

    it('works at any radius, the tolerance being the caller’s to choose', () => {
      const points: Point[] = [[0, 0]]

      expect(nearestPoint(points, [0, 20], 8)).toBeNull()
      expect(nearestPoint(points, [0, 20], 25)).toBe(0)
    })

    it('answers for negative coordinates, the canvas origin not being the backdrop’s', () => {
      expect(nearestPoint([[-300, -120]], [-298, -118], RADIUS)).toBe(0)
    })
  })

  describe('managed errors', () => {
    it('catches nothing in an empty set', () => {
      expect(nearestPoint([], [0, 0], RADIUS)).toBeNull()
    })

    it('catches nothing at a radius of zero unless the pointer is exactly on the anchor', () => {
      expect(nearestPoint([[10, 10]], [10, 11], 0)).toBeNull()
      expect(nearestPoint([[10, 10]], [10, 10], 0)).toBe(0)
    })

    it('catches nothing at a negative radius, not even an anchor exactly under the pointer', () => {
      // Squaring would make -8 behave as 8, which is the silent substitution squaredRadius refuses.
      expect(nearestPoint([[10, 10]], [10, 10], -8)).toBeNull()
      expect(nearestPoint([[10, 10]], [11, 10], -8)).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A for async — nothing here awaits or catches. What follows is the non-finite case.
    it('catches nothing for a pointer that is not a position', () => {
      expect(nearestPoint([[10, 10]], [Number.NaN, 10], RADIUS)).toBeNull()
    })

    it('ignores an anchor that is not a position instead of letting it win', () => {
      const points: Point[] = [
        [Number.NaN, Number.NaN],
        [10, 10],
      ]

      expect(nearestPoint(points, [10, 11], RADIUS)).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('does NOT catch an anchor 11 pixels away on the diagonal — the circle, not the box', () => {
      // 8 × √2 ≈ 11.3: a box test on |dx| and |dy| would catch this, a radius does not.
      const diagonal: Point[] = [[8, 8]]

      expect(nearestPoint(diagonal, [0, 0], RADIUS)).toBeNull()
      expect(distanceSquared([8, 8], [0, 0])).toBeGreaterThan(RADIUS * RADIUS)
    })

    it('catches the nearest of two anchors in range, not the first in the array', () => {
      const points: Point[] = [
        [105, 100],
        [101, 100],
      ]

      expect(nearestPoint(points, [100, 100], RADIUS)).toBe(1)
    })

    it('catches an anchor at exactly the radius, matching the handle’s drawn edge', () => {
      expect(nearestPoint([[8, 0]], [0, 0], RADIUS)).toBe(0)
      expect(nearestPoint([[9, 0]], [0, 0], RADIUS)).toBeNull()
    })

    it('keeps the earlier anchor when two are exactly as near, rather than flickering', () => {
      const points: Point[] = [
        [-4, 0],
        [4, 0],
      ]

      expect(nearestPoint(points, [0, 0], RADIUS)).toBe(0)
    })

    it('holds up on a dense outline, which is the real shape of this map', () => {
      // 1 000 anchors on a line, the pointer beside the 617th.
      const dense: Point[] = Array.from({ length: 1000 }, (_, i) => [i * 3, 0] as Point)

      expect(nearestPoint(dense, [617 * 3 + 1, 1], RADIUS)).toBe(617)
    })
  })
})
