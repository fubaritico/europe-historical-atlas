import { describe, expect, it } from 'vitest'

import { clamp, clamp01, easeInOut, lerp, readAt } from './math'

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

describe('easeInOut', () => {
  describe('happy path', () => {
    it('is still at both ends', () => {
      expect(easeInOut(0)).toBe(0)
      expect(easeInOut(1)).toBe(1)
    })

    it('is exactly halfway at halfway', () => {
      expect(easeInOut(0.5)).toBeCloseTo(0.5)
    })
  })

  describe('variants', () => {
    it('starts gently, unlike the ease-out the inertia uses', () => {
      // A flight is a move the reader did not make by hand, so it must not look yanked.
      expect(easeInOut(0.1)).toBeLessThan(0.1)
    })

    it('finishes gently too', () => {
      expect(easeInOut(0.9)).toBeGreaterThan(0.9)
    })

    it('never goes backwards', () => {
      let previous = -1
      for (let i = 0; i <= 20; i++) {
        const value = easeInOut(i / 20)
        expect(value).toBeGreaterThanOrEqual(previous)
        previous = value
      }
    })

    it('is symmetric about the middle', () => {
      expect(easeInOut(0.3) + easeInOut(0.7)).toBeCloseTo(1)
    })
  })

  describe('managed errors', () => {
    it('clamps progress past the ends rather than overshooting', () => {
      expect(easeInOut(-5)).toBe(0)
      expect(easeInOut(5)).toBe(1)
    })
  })

  describe('unmanaged errors', () => {
    it('propagates a non-finite progress rather than inventing one', () => {
      // Recorded, and the right failure mode: a NaN comes back as a NaN, which shows up at once as a
      // camera that has gone nowhere visible. Compare `reliefWorldY`, which reads a NaN elevation as
      // sea level — a plausible answer, and therefore a silent one. No caller can produce this: the
      // duration is guarded away from zero and the frame time comes from three's own Timer.
      expect(easeInOut(Number.NaN)).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('stays inside [0, 1] across the range', () => {
      for (let i = 0; i <= 20; i++) {
        const value = easeInOut(i / 20)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    })
  })
})

describe('readAt', () => {
  describe('happy path', () => {
    it('reads the value at an index in range', () => {
      expect(readAt(new Float32Array([1.5, 2.5]), 1)).toBe(2.5)
    })
  })

  describe('variants', () => {
    it('reads a plain array as well as a typed one', () => {
      expect(readAt([4, 5, 6], 0)).toBe(4)
    })
  })

  // L3: N/A — it has no handled error: a miss is carried, not handled.

  describe('unmanaged errors', () => {
    it('reads NaN past the end, never a plausible zero', () => {
      expect(readAt([1, 2], 2)).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('reads NaN at a negative index', () => {
      expect(readAt([1, 2], -1)).toBeNaN()
    })
  })
})
