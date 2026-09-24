import { describe, expect, it } from 'vitest'

import { hashInts } from './hash'

describe('hashInts', () => {
  describe('happy path', () => {
    it('returns a value in [0, 1)', () => {
      const v = hashInts(1, 2)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    })

    it('is deterministic for the same inputs', () => {
      expect(hashInts(7, 13, 42)).toBe(hashInts(7, 13, 42))
    })
  })

  describe('variants', () => {
    it('varies with the inputs (arity and values)', () => {
      expect(hashInts(1, 2)).not.toBe(hashInts(2, 1))
      expect(hashInts(1, 2)).not.toBe(hashInts(1, 2, 3))
      expect(hashInts(0, 0)).not.toBe(hashInts(0, 1))
    })

    it('spreads reasonably across a small grid (no obvious collisions)', () => {
      const seen = new Set<number>()
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) seen.add(hashInts(x, y))
      expect(seen.size).toBe(64)
    })
  })

  describe('managed errors', () => {
    it('returns a finite value for no arguments', () => {
      expect(Number.isFinite(hashInts())).toBe(true)
    })
  })

  describe('unmanaged errors', () => {
    it('handles negative integers without producing NaN or out-of-range values', () => {
      const v = hashInts(-5, -999)
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    })
  })

  describe('edge cases', () => {
    it('handles large integers and zero', () => {
      const v = hashInts(2 ** 30, 0)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    })
  })
})
