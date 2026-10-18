import { describe, expect, it } from 'vitest'

import { nearestStretch } from './stretchHit'

import type { Point } from '../viewport/viewport'

const SQUARE: Point[] = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
]
const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
]

describe('stretchHit', () => {
  describe('happy path', () => {
    it('finds the stretch under the pointer, and the point on it nearest the pointer', () => {
      expect(nearestStretch(SQUARE, EDGES, [40, 3], 8)).toEqual({ a: 0, b: 1, at: [40, 0] })
    })
  })

  describe('variants', () => {
    it('finds the stretch that closes the ring', () => {
      expect(nearestStretch(SQUARE, EDGES, [2, 60], 8)).toMatchObject({ a: 3, b: 0 })
    })
  })

  describe('managed errors', () => {
    it('finds nothing away from every stretch', () => {
      expect(nearestStretch(SQUARE, EDGES, [50, 50], 8)).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('skips a stretch naming an anchor the table does not hold', () => {
      expect(nearestStretch(SQUARE, [[0, 9]], [5, 0], 8)).toBeNull()
    })
  })

  describe('edge cases', () => {
    // Near a corner both stretches are in range: the nearer one wins, never storage order.
    it('takes the nearer of two stretches in range', () => {
      expect(nearestStretch(SQUARE, EDGES, [97, 5], 8)).toMatchObject({ a: 1, b: 2 })
    })

    it('clamps to the end of a stretch beyond it', () => {
      expect(nearestStretch(SQUARE, [[0, 1]], [104, 2], 8)?.at).toEqual([100, 0])
    })
  })
})
