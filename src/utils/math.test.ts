import { describe, expect, it } from 'vitest'

import { clamp, clamp01, lerp } from './math'

describe('math utils', () => {
  describe('happy path', () => {
    it('clamps within the range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp01(0.5)).toBe(0.5)
    })

    it('interpolates linearly', () => {
      expect(lerp(0, 10, 0.5)).toBe(5)
      expect(lerp(2, 4, 0)).toBe(2)
      expect(lerp(2, 4, 1)).toBe(4)
    })
  })

  describe('variants', () => {
    it('clamps below and above the bounds', () => {
      expect(clamp(-3, 0, 10)).toBe(0)
      expect(clamp(99, 0, 10)).toBe(10)
      expect(clamp01(-0.2)).toBe(0)
      expect(clamp01(1.7)).toBe(1)
    })

    it('extrapolates when t is outside [0, 1]', () => {
      expect(lerp(0, 10, 2)).toBe(20)
      expect(lerp(0, 10, -1)).toBe(-10)
    })
  })

  // L3/L4: N/A — pure arithmetic over finite numbers; no external input or async.

  describe('edge cases', () => {
    it('returns the bound when the value equals it', () => {
      expect(clamp(0, 0, 10)).toBe(0)
      expect(clamp(10, 0, 10)).toBe(10)
    })
  })
})
