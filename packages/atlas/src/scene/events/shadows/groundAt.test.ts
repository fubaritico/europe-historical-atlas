import { describe, expect, it } from 'vitest'

import { groundAtFrom } from './groundAt'

import type { WorldPoint } from '../../relief/drapeProjection'

/** A map 12 wide and 8 deep, centred on the origin, whose relief's height is u + 10 v. */
const PROJECTION = {
  toWorld: (u: number, v: number): WorldPoint => [(u - 0.5) * 12, 0, (v - 0.5) * 8],
  draped: (u: number, v: number): WorldPoint => [(u - 0.5) * 12, u + 10 * v, (v - 0.5) * 8],
}

describe('groundAtFrom', () => {
  describe('happy path', () => {
    it('reads the relief’s height under the map’s centre', () => {
      expect(groundAtFrom(PROJECTION)(0, 0)).toBeCloseTo(0.5 + 5)
    })
  })

  describe('variants', () => {
    it('turns a world position into the grid’s fractions, on both axes', () => {
      const groundAt = groundAtFrom(PROJECTION)
      // The north-west corner, then the south-east.
      expect(groundAt(-6, -4)).toBeCloseTo(0)
      expect(groundAt(6, 4)).toBeCloseTo(11)
    })
  })

  // L3: N/A — nothing is refused: the layer asks only once the map is drawn
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('reads past the map’s edge as the projection does, without clamping', () => {
      expect(groundAtFrom(PROJECTION)(12, 0)).toBeCloseTo(1.5 + 5)
    })
  })
})
