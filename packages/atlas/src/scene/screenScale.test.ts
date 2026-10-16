import { describe, expect, it } from 'vitest'

import { pixelsPerWorldUnit } from './screenScale'

describe('pixelsPerWorldUnit', () => {
  describe('happy path', () => {
    it('spreads the viewport height over what the camera sees at that distance', () => {
      // At 90° the visible height is twice the distance: 2 units over 800 px.
      expect(pixelsPerWorldUnit(1, 90, 800)).toBeCloseTo(400, 9)
    })
  })

  describe('variants', () => {
    it('doubles when the camera comes twice as close, so a dash in pixels halves in world units', () => {
      expect(pixelsPerWorldUnit(0.5, 50, 900)).toBeCloseTo(2 * pixelsPerWorldUnit(1, 50, 900), 9)
    })

    it('grows with a narrower field of view', () => {
      expect(pixelsPerWorldUnit(1, 30, 900)).toBeGreaterThan(pixelsPerWorldUnit(1, 60, 900))
    })
  })

  // L3 (managed errors): N/A — arithmetic on three numbers, nothing is refused.

  describe('unmanaged errors', () => {
    it('carries a NaN distance through', () => {
      expect(pixelsPerWorldUnit(Number.NaN, 50, 900)).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('is infinite at zero distance rather than clamped', () => {
      expect(pixelsPerWorldUnit(0, 50, 900)).toBe(Infinity)
    })
  })
})
