import { describe, expect, it } from 'vitest'

import { EARTH_RADIUS_KM } from '../geo/signedDistance'

import { HATCH_STRIPE_KM, hatchStripeWorld } from './hatchStripes'

// ATLAS-399: one stripe's width, from kilometres on the ground to world units on the plane.

describe('hatchStripeWorld', () => {
  describe('happy path', () => {
    it('gives a stripe its share of the plane: its kilometres over the kilometres across', () => {
      // A frame on the equator, 1 radian across: the plane is R km wide.
      const bbox = { west: 0, south: -1, east: 180 / Math.PI, north: 1 }
      expect(hatchStripeWorld(bbox, 100)).toBeCloseTo(
        (HATCH_STRIPE_KM / (EARTH_RADIUS_KM * Math.cos(0))) * 100,
        9
      )
    })
  })

  describe('variants', () => {
    it('widens a stripe on a frame further north, where a degree is shorter', () => {
      const south = { west: 0, south: 30, east: 10, north: 40 }
      const north = { west: 0, south: 55, east: 10, north: 65 }
      expect(hatchStripeWorld(north, 100)).toBeGreaterThan(hatchStripeWorld(south, 100))
    })

    it('grows with the plane, in proportion', () => {
      const bbox = { west: -10, south: 35, east: 10, north: 60 }
      expect(hatchStripeWorld(bbox, 200)).toBeCloseTo(2 * hatchStripeWorld(bbox, 100), 9)
    })
  })

  // L3: N/A — no input is refused: a frame is the relief's, checked where it is read.
  // L4: N/A — pure arithmetic.

  describe('edge cases', () => {
    it('gives a frame of no width an infinite stripe, never a plausible one', () => {
      expect(hatchStripeWorld({ west: 5, south: 40, east: 5, north: 50 }, 100)).toBe(Infinity)
    })
  })
})
