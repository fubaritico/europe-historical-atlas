import { describe, expect, it } from 'vitest'

import { insideRings, polityAt } from './fillHit'

import type { Point } from '../view/viewport'

/** A square from (x, y) to (x + size, y + size). */
function square(x: number, y: number, size: number): Point[] {
  return [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
  ]
}

const KINGDOM = { polity: 'fr', rings: [square(0, 0, 100)] }
const DUCHY = { polity: 'aq', rings: [square(20, 20, 30)] }

describe('fillHit', () => {
  describe('happy path', () => {
    it('finds the polity whose territory is under the pointer', () => {
      expect(polityAt([KINGDOM], [50, 50])).toBe('fr')
    })
  })

  describe('variants', () => {
    // The one painted last is on top: the duchy drawn inside its kingdom.
    it('takes the polity painted last where two overlap', () => {
      expect(polityAt([KINGDOM, DUCHY], [30, 30])).toBe('aq')
      expect(polityAt([KINGDOM, DUCHY], [80, 80])).toBe('fr')
    })

    it('finds a second piece of the same polity', () => {
      expect(
        polityAt([{ polity: 'fr', rings: [square(0, 0, 10), square(50, 50, 10)] }], [55, 55])
      ).toBe('fr')
    })
  })

  describe('managed errors', () => {
    it('finds nobody over unclaimed ground', () => {
      expect(polityAt([KINGDOM], [150, 50])).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('finds nobody in a ring of fewer than three points', () => {
      expect(
        insideRings(
          [
            [
              [0, 0],
              [10, 10],
            ],
          ],
          [5, 5]
        )
      ).toBe(false)
    })
  })

  describe('edge cases', () => {
    // H-07: a ring inside another of the same claim is a hole.
    it('finds nobody in a hole', () => {
      const holed = { polity: 'pl', rings: [square(0, 0, 100), square(40, 40, 20)] }
      expect(polityAt([holed], [50, 50])).toBeNull()
      expect(polityAt([holed], [10, 10])).toBe('pl')
    })

    it('finds nobody when there is no territory at all', () => {
      expect(polityAt([], [0, 0])).toBeNull()
    })
  })
})
