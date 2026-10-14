import { describe, expect, it } from 'vitest'

import { lineStretch, lineStretches, nearestLineVertex, shortestRunBetween } from './lineSnap'

import type { SnapLine } from './lineSnap'

/** A closed square of eight points, 10 apart, around (0,0)–(20,20). */
const ISLAND: SnapLine = {
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
const SHORE: SnapLine = {
  points: [
    [100, 0],
    [110, 0],
    [120, 0],
  ],
  closed: false,
  bounds: { left: 100, top: 0, right: 120, bottom: 0 },
}

describe('lineSnap', () => {
  describe('happy path', () => {
    it('finds the coast vertex under the pointer', () => {
      expect(nearestLineVertex([ISLAND, SHORE], [109, 2], 5)).toEqual({ contour: 1, vertex: 1 })
    })

    // s02 — "the whole coastline sub-path between the two is inserted".
    it('takes the stretch between two vertices of an open shore', () => {
      expect(lineStretch(SHORE, 0, 2)).toEqual([
        [100, 0],
        [110, 0],
        [120, 0],
      ])
    })
  })

  describe('variants', () => {
    // The dev's call: around a closed contour, the shorter way — here backwards across index 0.
    it('walks a closed contour the shorter way, across its start', () => {
      expect(lineStretch(ISLAND, 1, 7)).toEqual([
        [10, 0],
        [0, 0],
        [0, 10],
      ])
    })

    it('walks forward when forward is shorter', () => {
      expect(lineStretch(ISLAND, 1, 3)).toEqual([
        [10, 0],
        [20, 0],
        [20, 10],
      ])
    })

    it('walks an open shore against its order, as clicked', () => {
      expect(lineStretch(SHORE, 2, 0)).toEqual([
        [120, 0],
        [110, 0],
        [100, 0],
      ])
    })
  })

  describe('managed errors', () => {
    it('finds nothing when the coast is out of reach', () => {
      expect(nearestLineVertex([ISLAND, SHORE], [60, 60], 5)).toBeNull()
    })

    it('takes no stretch between indices that are not vertices', () => {
      expect(lineStretch(ISLAND, 0, 8)).toEqual([])
      expect(lineStretch(ISLAND, -1, 2)).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    // A negative radius catches nothing: the shared rule of hitTest.
    it('catches nothing with a negative radius', () => {
      expect(nearestLineVertex([ISLAND], [0, 0], -5)).toBeNull()
    })
  })

  describe('edge cases', () => {
    // Every contour in reach is weighed: storage order must not pick the island over the nearer shore.
    it('takes the nearer of two contours both in reach', () => {
      const near: SnapLine = {
        ...SHORE,
        points: [[24, 0]],
        bounds: { left: 24, top: 0, right: 24, bottom: 0 },
      }
      expect(nearestLineVertex([ISLAND, near], [23, 0], 5)).toEqual({ contour: 1, vertex: 0 })
    })

    it('takes the single vertex when both clicks land on it', () => {
      expect(lineStretch(ISLAND, 4, 4)).toEqual([[20, 20]])
    })

    // Halfway round, either way is as short: forward is taken, so the answer does not flicker.
    it('goes forward when both ways are as long', () => {
      expect(lineStretch(ISLAND, 0, 4).at(-1)).toEqual([20, 20])
      expect(lineStretch(ISLAND, 0, 4)[1]).toEqual([10, 0])
    })
  })
})

describe('shortestRunBetween', () => {
  const RING = [10, 11, 12, 13, 14, 15]

  describe('happy path', () => {
    it('walks a ring of anchor indices the shorter way', () => {
      expect(shortestRunBetween(RING, 1, 5)).toEqual([11, 10, 15])
    })
  })

  describe('variants', () => {
    it('walks forward when forward is shorter', () => {
      expect(shortestRunBetween(RING, 1, 3)).toEqual([11, 12, 13])
    })
  })

  describe('managed errors', () => {
    it('gives nothing for a position outside the ring', () => {
      expect(shortestRunBetween(RING, 0, 6)).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('gives nothing for a position that is not a whole number', () => {
      expect(shortestRunBetween(RING, 0.5, 2)).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('gives the one item when both positions are the same', () => {
      expect(shortestRunBetween(RING, 2, 2)).toEqual([12])
    })
  })
})

// The dev, round the Nile, 2026-10-14: the Pen takes the other way round when the short one runs back
// over what it laid, so both ways must be on offer.
describe('lineStretches', () => {
  describe('happy path', () => {
    it('gives both ways round a closed contour, the shorter first', () => {
      expect(lineStretches(ISLAND, 1, 3)).toEqual([
        [
          [10, 0],
          [20, 0],
          [20, 10],
        ],
        [
          [10, 0],
          [0, 0],
          [0, 10],
          [0, 20],
          [10, 20],
          [20, 20],
          [20, 10],
        ],
      ])
    })
  })

  describe('variants', () => {
    it('gives the one way along an open line', () => {
      expect(lineStretches(SHORE, 2, 0)).toEqual([
        [
          [120, 0],
          [110, 0],
          [100, 0],
        ],
      ])
    })
  })

  describe('managed errors', () => {
    it('gives nothing for a position that is not a vertex', () => {
      expect(lineStretches(ISLAND, 0, 8)).toEqual([])
      expect(lineStretches(SHORE, 0, 5)).toEqual([])
    })
  })

  // L4: N/A — pure arithmetic over literals, no collaborator to fail.

  describe('edge cases', () => {
    it('puts the forward way first when both are as long', () => {
      expect(lineStretches(ISLAND, 0, 4)[0]?.[1]).toEqual([10, 0])
    })
  })
})
