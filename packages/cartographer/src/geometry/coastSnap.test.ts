import { describe, expect, it } from 'vitest'

import { coastStretch, nearestCoastVertex } from './coastSnap'

import type { CoastContour } from './coastSnap'

/** A closed square of eight points, 10 apart, around (0,0)–(20,20). */
const ISLAND: CoastContour = {
  points: [
    [0, 0],
    [10, 0],
    [20, 0],
    [20, 10],
    [20, 20],
    [10, 20],
    [0, 20],
    [0, 10],
  ],
  closed: true,
  bounds: { left: 0, top: 0, right: 20, bottom: 20 },
}

/** An open shore far to the east. */
const SHORE: CoastContour = {
  points: [
    [100, 0],
    [110, 0],
    [120, 0],
  ],
  closed: false,
  bounds: { left: 100, top: 0, right: 120, bottom: 0 },
}

describe('coastSnap', () => {
  describe('happy path', () => {
    it('finds the coast vertex under the pointer', () => {
      expect(nearestCoastVertex([ISLAND, SHORE], [109, 2], 5)).toEqual({ contour: 1, vertex: 1 })
    })

    // s02 — "the whole coastline sub-path between the two is inserted".
    it('takes the stretch between two vertices of an open shore', () => {
      expect(coastStretch(SHORE, 0, 2)).toEqual([
        [100, 0],
        [110, 0],
        [120, 0],
      ])
    })
  })

  describe('variants', () => {
    // The dev's call: around a closed contour, the shorter way — here backwards across index 0.
    it('walks a closed contour the shorter way, across its start', () => {
      expect(coastStretch(ISLAND, 1, 7)).toEqual([
        [10, 0],
        [0, 0],
        [0, 10],
      ])
    })

    it('walks forward when forward is shorter', () => {
      expect(coastStretch(ISLAND, 1, 3)).toEqual([
        [10, 0],
        [20, 0],
        [20, 10],
      ])
    })

    it('walks an open shore against its order, as clicked', () => {
      expect(coastStretch(SHORE, 2, 0)).toEqual([
        [120, 0],
        [110, 0],
        [100, 0],
      ])
    })
  })

  describe('managed errors', () => {
    it('finds nothing when the coast is out of reach', () => {
      expect(nearestCoastVertex([ISLAND, SHORE], [60, 60], 5)).toBeNull()
    })

    it('takes no stretch between indices that are not vertices', () => {
      expect(coastStretch(ISLAND, 0, 8)).toEqual([])
      expect(coastStretch(ISLAND, -1, 2)).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    // A negative radius catches nothing: the shared rule of hitTest.
    it('catches nothing with a negative radius', () => {
      expect(nearestCoastVertex([ISLAND], [0, 0], -5)).toBeNull()
    })
  })

  describe('edge cases', () => {
    // Every contour in reach is weighed: storage order must not pick the island over the nearer shore.
    it('takes the nearer of two contours both in reach', () => {
      const near: CoastContour = {
        ...SHORE,
        points: [[24, 0]],
        bounds: { left: 24, top: 0, right: 24, bottom: 0 },
      }
      expect(nearestCoastVertex([ISLAND, near], [23, 0], 5)).toEqual({ contour: 1, vertex: 0 })
    })

    it('takes the single vertex when both clicks land on it', () => {
      expect(coastStretch(ISLAND, 4, 4)).toEqual([[20, 20]])
    })

    // Halfway round, either way is as short: forward is taken, so the answer does not flicker.
    it('goes forward when both ways are as long', () => {
      expect(coastStretch(ISLAND, 0, 4).at(-1)).toEqual([20, 20])
      expect(coastStretch(ISLAND, 0, 4)[1]).toEqual([10, 0])
    })
  })
})
