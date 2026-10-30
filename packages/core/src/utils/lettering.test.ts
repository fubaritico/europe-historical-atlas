import { describe, expect, it } from 'vitest'

import { brandMarkGeometry } from './lettering'

describe('brandMarkGeometry', () => {
  describe('happy path', () => {
    it('gives back the measured radius, lambda size and baseline at a side of 20', () => {
      expect(brandMarkGeometry(20)).toEqual({ radius: 4, glyphSize: 17, baseline: 15.9 })
    })
  })

  describe('variants', () => {
    it('scales every part with the side, rounded to the hundredth', () => {
      expect(brandMarkGeometry(24)).toEqual({ radius: 4.8, glyphSize: 20.4, baseline: 19.08 })
      expect(brandMarkGeometry(96)).toEqual({ radius: 19.2, glyphSize: 81.6, baseline: 76.32 })
    })

    it('rounds a side that does not divide evenly', () => {
      expect(brandMarkGeometry(7)).toEqual({ radius: 1.4, glyphSize: 5.95, baseline: 5.57 })
    })
  })

  // L3: N/A — pure arithmetic, nothing refused.

  describe('unmanaged errors', () => {
    it('carries a NaN side through rather than inventing a size', () => {
      const geometry = brandMarkGeometry(Number.NaN)

      expect(geometry.radius).toBeNaN()
      expect(geometry.baseline).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('collapses to nothing at a side of 0', () => {
      expect(brandMarkGeometry(0)).toEqual({ radius: 0, glyphSize: 0, baseline: 0 })
    })
  })
})
