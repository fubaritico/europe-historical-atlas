import { describe, expect, it } from 'vitest'

import { createHeightmap, smoothHeightmap } from './heightmap'

import type { HeightmapMeta } from './heightmap'

/** Build minimal metadata for a test grid. */
function meta(width: number, height: number, max = 100): HeightmapMeta {
  return {
    width,
    height,
    zoom: 5,
    bbox: { west: 0, south: 0, east: 1, north: 1 },
    min: 0,
    max,
    encoding: 'int16-le-metres',
  }
}

describe('createHeightmap.sample', () => {
  // 2×2 grid: [0, 10; 20, 30]
  const hm = createHeightmap(meta(2, 2, 30), new Int16Array([0, 10, 20, 30]))

  describe('happy path', () => {
    it('returns exact grid values at the corners', () => {
      expect(hm.sample(0, 0)).toBe(0)
      expect(hm.sample(1, 0)).toBe(10)
      expect(hm.sample(0, 1)).toBe(20)
      expect(hm.sample(1, 1)).toBe(30)
    })

    it('bilinearly interpolates at the centre', () => {
      expect(hm.sample(0.5, 0.5)).toBeCloseTo(15) // mean of 0, 10, 20, 30
    })
  })

  describe('variants', () => {
    it('interpolates along a single axis', () => {
      const row = createHeightmap(meta(2, 1, 10), new Int16Array([0, 10]))
      expect(row.sample(0.25, 0)).toBeCloseTo(2.5)
      expect(row.sample(0.75, 0)).toBeCloseTo(7.5)
    })
  })

  describe('managed errors', () => {
    it('clamps out-of-range coordinates to the edges', () => {
      expect(hm.sample(-1, -1)).toBe(0)
      expect(hm.sample(2, 2)).toBe(30)
    })
  })

  describe('unmanaged errors', () => {
    it('does not throw for NaN coordinates', () => {
      expect(() => hm.sample(Number.NaN, 0)).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('handles a 1×1 grid', () => {
      const single = createHeightmap(meta(1, 1, 5), new Int16Array([5]))
      expect(single.sample(0.5, 0.5)).toBe(5)
    })
  })
})

describe('smoothHeightmap', () => {
  describe('happy path', () => {
    it('attenuates an isolated spike toward its neighbourhood', () => {
      // 3×3 grid, spike in the centre
      const hm = createHeightmap(meta(3, 3, 90), new Int16Array([0, 0, 0, 0, 90, 0, 0, 0, 0]))
      const centre = smoothHeightmap(hm, 1).sample(0.5, 0.5)
      expect(centre).toBeLessThan(90)
      expect(centre).toBeGreaterThan(0)
    })
  })

  describe('variants', () => {
    it('returns the source unchanged for radius 0', () => {
      const hm = createHeightmap(meta(2, 2, 30), new Int16Array([0, 10, 20, 30]))
      expect(smoothHeightmap(hm, 0)).toBe(hm)
    })
  })

  describe('managed errors', () => {
    it('treats a negative radius as a no-op', () => {
      const hm = createHeightmap(meta(2, 2, 30), new Int16Array([0, 10, 20, 30]))
      expect(smoothHeightmap(hm, -3)).toBe(hm)
    })
  })

  describe('unmanaged errors', () => {
    it('does not throw when the radius exceeds the grid', () => {
      const hm = createHeightmap(meta(2, 2, 30), new Int16Array([0, 10, 20, 30]))
      expect(() => smoothHeightmap(hm, 10)).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('preserves a constant field', () => {
      const hm = createHeightmap(meta(3, 3, 7), new Int16Array([7, 7, 7, 7, 7, 7, 7, 7, 7]))
      expect(smoothHeightmap(hm, 2).sample(0.5, 0.5)).toBeCloseTo(7)
    })
  })
})
