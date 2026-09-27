import { describe, expect, it } from 'vitest'

import { pointInRing, pointInRings } from './pointInRing'

/** A unit square, counter-clockwise, closure implied. */
const square: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
]

/** A smaller square inside it, which even-odd turns into a hole. */
const inner: [number, number][] = [
  [3, 3],
  [7, 3],
  [7, 7],
  [3, 7],
]

describe('pointInRing', () => {
  describe('happy path', () => {
    it('says yes for a point in the middle', () => {
      expect(pointInRing([5, 5], square)).toBe(true)
    })

    it('says no for a point outside', () => {
      expect(pointInRing([20, 5], square)).toBe(false)
      expect(pointInRing([-1, 5], square)).toBe(false)
      expect(pointInRing([5, 20], square)).toBe(false)
    })
  })

  describe('variants', () => {
    it('works on a ring wound the other way', () => {
      expect(pointInRing([5, 5], [...square].reverse())).toBe(true)
    })

    it('tolerates a ring that repeats its first vertex at the end', () => {
      expect(pointInRing([5, 5], [...square, [0, 0]])).toBe(true)
    })

    it('handles a concave shape, where a bounding box would be wrong', () => {
      // An L: the point sits inside the box and outside the shape.
      const ell: [number, number][] = [
        [0, 0],
        [10, 0],
        [10, 3],
        [3, 3],
        [3, 10],
        [0, 10],
      ]
      expect(pointInRing([7, 7], ell)).toBe(false)
      expect(pointInRing([1, 7], ell)).toBe(true)
    })

    it('handles negative longitudes, which half our frame has', () => {
      const west: [number, number][] = [
        [-45, 40],
        [-30, 40],
        [-30, 50],
        [-45, 50],
      ]
      expect(pointInRing([-40, 45], west)).toBe(true)
      expect(pointInRing([-20, 45], west)).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('says no for a ring with nothing in it', () => {
      expect(pointInRing([5, 5], [])).toBe(false)
    })

    it('says no for a ring that cannot enclose anything', () => {
      expect(
        pointInRing(
          [5, 5],
          [
            [0, 0],
            [10, 0],
          ]
        )
      ).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    // L4: pure arithmetic, no async, no collaborator.

    it('does not count a vertex the ray passes through twice', () => {
      // The reason the crossing test is written the long way: the symmetric form double-counts a vertex
      // exactly on the ray and flips the answer for a whole column of queries.
      const diamond: [number, number][] = [
        [5, 0],
        [10, 5],
        [5, 10],
        [0, 5],
      ]
      expect(pointInRing([5, 5], diamond)).toBe(true)
      expect(pointInRing([11, 5], diamond)).toBe(false)
      expect(pointInRing([-1, 5], diamond)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('is stable for a point far outside in both directions', () => {
      expect(pointInRing([1e6, 1e6], square)).toBe(false)
      expect(pointInRing([-1e6, -1e6], square)).toBe(false)
    })
  })
})

describe('pointInRings', () => {
  describe('happy path', () => {
    it('says yes inside the outer ring', () => {
      expect(pointInRings([1, 1], [square])).toBe(true)
    })
  })

  describe('variants', () => {
    it('treats a ring inside a ring as a hole, with nothing declaring it', () => {
      expect(pointInRings([5, 5], [square, inner])).toBe(false)
      expect(pointInRings([1, 1], [square, inner])).toBe(true)
    })

    it('treats two disjoint rings as two pieces, which never cancel', () => {
      const exclave: [number, number][] = [
        [20, 0],
        [25, 0],
        [25, 5],
        [20, 5],
      ]
      expect(pointInRings([5, 5], [square, exclave])).toBe(true)
      expect(pointInRings([22, 2], [square, exclave])).toBe(true)
      expect(pointInRings([15, 2], [square, exclave])).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('says no when a polity holds nothing', () => {
      expect(pointInRings([5, 5], [])).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('ignores a ring too small to enclose anything', () => {
      expect(pointInRings([5, 5], [square, [[1, 1]]])).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles a hole inside a hole, which is solid again', () => {
      const core: [number, number][] = [
        [4, 4],
        [6, 4],
        [6, 6],
        [4, 6],
      ]
      expect(pointInRings([5, 5], [square, inner, core])).toBe(true)
    })
  })
})
