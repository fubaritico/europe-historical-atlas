import { describe, expect, it } from 'vitest'

import { SHADOW_SUN, pinFootprint, shadowDirection, shadowReach } from './shadowFootprint'

describe('shadowFootprint', () => {
  describe('happy path', () => {
    it('casts the shadows of a north-west sun to the south-east: east and south both positive', () => {
      const [x, z] = shadowDirection(SHADOW_SUN)
      expect(x).toBeCloseTo(Math.SQRT1_2)
      expect(z).toBeCloseTo(Math.SQRT1_2)
    })

    it('lays a pin’s shadow as its stem from the foot to the head’s shadow, and the head as a disc there', () => {
      const footprint = pinFootprint({ height: 1, radius: 0.2, stemRadius: 0.05 }, SHADOW_SUN)
      const tip = shadowReach(1, SHADOW_SUN)
      expect(footprint.capsules).toEqual([
        { from: 0, to: tip, radius: 0.05 },
        { from: tip, to: tip, radius: 0.2 },
      ])
    })
  })

  describe('variants', () => {
    it('casts a sun due north’s shadow due south', () => {
      const [x, z] = shadowDirection({ azimuthDeg: 0, elevationDeg: 35 })
      expect(x).toBeCloseTo(0)
      expect(z).toBeCloseTo(1)
    })

    it('casts a shadow as long as the height under a sun at 45°, and longer under a lower one', () => {
      expect(shadowReach(2, { azimuthDeg: 315, elevationDeg: 45 })).toBeCloseTo(2)
      expect(shadowReach(2, { azimuthDeg: 315, elevationDeg: 20 })).toBeGreaterThan(2)
    })
  })

  // L3: N/A — nothing is refused: the measures are the pin's own constants
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('casts no length for a point on the ground', () => {
      expect(shadowReach(0, SHADOW_SUN)).toBe(0)
    })
  })
})
