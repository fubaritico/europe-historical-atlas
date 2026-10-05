import { describe, expect, it } from 'vitest'

import { RENDER_FRAME } from './backdropFrame'
import {
  EQUATORIAL_CIRCUMFERENCE_M,
  isBackdropExceeded,
  kmPerScreenPixel,
  metresPerBackdropPixel,
} from './resolution'

import type { PixelSize, Viewport } from './viewport'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/** The real backdrop and its bounds, imported rather than re-declared — see `backdropFrame.ts`. */
const BACKDROP: PixelSize = RENDER_FRAME.size
const BOUNDS: GeoBounds = RENDER_FRAME.bounds

/** The backdrop drawn at its own resolution. */
const NATIVE: Viewport = { scale: 1, originX: 0, originY: 0 }

describe('resolution', () => {
  describe('happy path', () => {
    it('reproduces the figure this repository already recorded: 7.6 km per pixel at 45°N', () => {
      const metres = metresPerBackdropPixel(BACKDROP, BOUNDS, 45)

      expect(metres).toBeGreaterThan(7550)
      expect(metres).toBeLessThan(7650)
      expect(Math.round(metres)).toBe(7610)
    })

    it('prints kilometres per screen pixel at the backdrop’s own scale', () => {
      expect(kmPerScreenPixel(NATIVE, BACKDROP, BOUNDS, 45)).toBeCloseTo(7.6101, 4)
    })

    it('says the backdrop has given out only once it is magnified', () => {
      expect(isBackdropExceeded(NATIVE)).toBe(false)
      expect(isBackdropExceeded({ ...NATIVE, scale: 1.0001 })).toBe(true)
    })
  })

  describe('variants', () => {
    it('covers less ground the further north it is measured', () => {
      const equator = metresPerBackdropPixel(BACKDROP, BOUNDS, 0)
      const mid = metresPerBackdropPixel(BACKDROP, BOUNDS, 45)
      const north = metresPerBackdropPixel(BACKDROP, BOUNDS, 70)

      expect(equator).toBeGreaterThan(mid)
      expect(mid).toBeGreaterThan(north)
      expect(equator).toBeCloseTo(10762, 0)
    })

    it('is symmetric about the equator, cos being even', () => {
      expect(metresPerBackdropPixel(BACKDROP, BOUNDS, 50)).toBeCloseTo(
        metresPerBackdropPixel(BACKDROP, BOUNDS, -50),
        9
      )
    })

    it('halves the ground per screen pixel when the view doubles', () => {
      const one = kmPerScreenPixel(NATIVE, BACKDROP, BOUNDS, 45)

      expect(kmPerScreenPixel({ ...NATIVE, scale: 2 }, BACKDROP, BOUNDS, 45)).toBeCloseTo(
        one / 2,
        9
      )
      expect(kmPerScreenPixel({ ...NATIVE, scale: 0.5 }, BACKDROP, BOUNDS, 45)).toBeCloseTo(
        one * 2,
        9
      )
    })

    it('scales with the backdrop: a 4x finer grid covers a quarter of the ground per pixel', () => {
      const coarse = metresPerBackdropPixel(BACKDROP, BOUNDS, 45)
      const fine = metresPerBackdropPixel({ width: 5120, height: 4656 }, BOUNDS, 45)

      expect(fine).toBeCloseTo(coarse / 4, 9)
      // The political raster at 4x, which known-issues records as 1.9 km cells.
      expect(fine / 1000).toBeCloseTo(1.9, 1)
    })

    it('derives the equatorial figure from the circumference it declares', () => {
      expect(metresPerBackdropPixel(BACKDROP, BOUNDS, 0)).toBeCloseTo(
        (EQUATORIAL_CIRCUMFERENCE_M * (123.75 / 360)) / 1280,
        9
      )
    })
  })

  describe('managed errors', () => {
    it('reports no ground at all at the pole, which is what Mercator says', () => {
      expect(metresPerBackdropPixel(BACKDROP, BOUNDS, 90)).toBeCloseTo(0, 9)
    })

    it('reports zero span for bounds with no width, rather than dividing', () => {
      expect(metresPerBackdropPixel(BACKDROP, { ...BOUNDS, east: -45 }, 45)).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A for async — nothing here awaits or catches. The cases below are the non-finite ones.
    it('divides loudly for a backdrop of no width', () => {
      expect(metresPerBackdropPixel({ width: 0, height: 1164 }, BOUNDS, 45)).toBe(Infinity)
    })

    it('divides loudly for a view at scale zero', () => {
      expect(kmPerScreenPixel({ ...NATIVE, scale: 0 }, BACKDROP, BOUNDS, 45)).toBe(Infinity)
    })
  })

  describe('edge cases', () => {
    it('holds the threshold exactly at parity, where the backdrop is still honest', () => {
      expect(isBackdropExceeded({ ...NATIVE, scale: 1 })).toBe(false)
      expect(isBackdropExceeded({ ...NATIVE, scale: 0.999 })).toBe(false)
    })

    it('says nothing about the vectors: the warning is about the picture, not the data', () => {
      // The same view is "exceeded" whatever the bounds or the grid, because the test is on the scale
      // alone — which is the point: no latitude, no grid size, no number to re-derive.
      expect(isBackdropExceeded({ scale: 8, originX: -5000, originY: 12000 })).toBe(true)
    })
  })
})
