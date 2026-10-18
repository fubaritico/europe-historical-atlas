import { describe, expect, it } from 'vitest'

import { backdropToScreen, clampScale, panBy, screenToBackdrop, zoomAbout } from './viewport'

import type { ScaleLimits, Viewport } from './viewport'

/** A view at half resolution, offset, so neither axis can pass by accident. */
const HALF: Viewport = { scale: 0.5, originX: 40, originY: -12 }

/** Limits wide enough never to bite, for the tests that are not about clamping. */
const WIDE: ScaleLimits = { min: 0.01, max: 100 }

describe('viewport', () => {
  describe('happy path', () => {
    it('places a backdrop pixel on screen', () => {
      expect(backdropToScreen(HALF, [100, 200])).toEqual([90, 88])
    })

    it('reads back the backdrop pixel under a screen position', () => {
      expect(screenToBackdrop(HALF, [90, 88])).toEqual([100, 200])
    })

    it('moves the whole view with the pointer, without changing the scale', () => {
      expect(panBy(HALF, 15, -7)).toEqual({ scale: 0.5, originX: 55, originY: -19 })
    })

    it('holds the point under the pointer when it zooms — the one invariant', () => {
      const pointer = [321, 207] as const
      const before = screenToBackdrop(HALF, pointer)

      const after = screenToBackdrop(zoomAbout(HALF, pointer, 2, WIDE), pointer)

      expect(after[0]).toBeCloseTo(before[0], 10)
      expect(after[1]).toBeCloseTo(before[1], 10)
    })
  })

  describe('variants', () => {
    it('round-trips at every scale, in both directions', () => {
      for (const scale of [0.125, 0.5, 1, 3, 17.5]) {
        const view: Viewport = { scale, originX: -31, originY: 64 }
        const [u, v] = screenToBackdrop(view, [222, 111])

        const [x, y] = backdropToScreen(view, [u, v])

        expect(x).toBeCloseTo(222, 9)
        expect(y).toBeCloseTo(111, 9)
      }
    })

    it('holds the point whether it zooms in or out, and wherever the pointer is', () => {
      for (const factor of [0.25, 0.9, 1.1, 4]) {
        for (const pointer of [
          [0, 0],
          [1, 1],
          [640, 480],
          [-50, 900],
        ] as const) {
          const before = screenToBackdrop(HALF, pointer)

          const after = screenToBackdrop(zoomAbout(HALF, pointer, factor, WIDE), pointer)

          expect(after[0]).toBeCloseTo(before[0], 8)
          expect(after[1]).toBeCloseTo(before[1], 8)
        }
      }
    })

    it('scales by the factor it was given', () => {
      expect(zoomAbout(HALF, [10, 10], 4, WIDE).scale).toBeCloseTo(2, 12)
      expect(zoomAbout(HALF, [10, 10], 0.5, WIDE).scale).toBeCloseTo(0.25, 12)
    })

    it('leaves a scale that is already inside its limits alone', () => {
      expect(clampScale(2, WIDE)).toBe(2)
      expect(clampScale(0.01, WIDE)).toBe(0.01)
      expect(clampScale(100, WIDE)).toBe(100)
    })

    it('pulls a scale back to the nearest limit', () => {
      expect(clampScale(1000, WIDE)).toBe(100)
      expect(clampScale(0.0001, WIDE)).toBe(0.01)
    })
  })

  describe('managed errors', () => {
    it('still holds the point when the zoom hits its limit', () => {
      const limits: ScaleLimits = { min: 0.5, max: 1 }
      const pointer = [400, 300] as const
      const before = screenToBackdrop(HALF, pointer)

      // Asks for 8×, which the limits cut to 2×.
      const zoomed = zoomAbout(HALF, pointer, 8, limits)
      const after = screenToBackdrop(zoomed, pointer)

      expect(zoomed.scale).toBe(1)
      expect(after[0]).toBeCloseTo(before[0], 10)
      expect(after[1]).toBeCloseTo(before[1], 10)
    })

    it('neither scales nor slides when it is already at the limit', () => {
      const limits: ScaleLimits = { min: 0.5, max: 0.5 }

      expect(zoomAbout(HALF, [120, 90], 4, limits)).toEqual(HALF)
    })

    it('reads reversed limits as the pair they describe', () => {
      expect(clampScale(5, { min: 10, max: 1 })).toBe(5)
      expect(clampScale(50, { min: 10, max: 1 })).toBe(10)
      expect(clampScale(0.1, { min: 10, max: 1 })).toBe(1)
    })
  })

  describe('unmanaged errors', () => {
    it('lets a scale of zero divide loudly instead of substituting a plausible pixel', () => {
      const dead: Viewport = { scale: 0, originX: 0, originY: 0 }

      const [u, v] = screenToBackdrop(dead, [10, -10])

      expect(u).toBe(Infinity)
      expect(v).toBe(-Infinity)
    })

    it('falls back to the low limit for a scale that is not a number', () => {
      expect(clampScale(Number.NaN, WIDE)).toBe(0.01)
      expect(clampScale(Infinity, WIDE)).toBe(0.01)
    })

    it('carries a non-finite factor into the clamp rather than silently keeping the old scale', () => {
      expect(zoomAbout(HALF, [10, 10], Number.NaN, WIDE).scale).toBe(0.01)
    })
  })

  describe('edge cases', () => {
    it('does not drift over a long run of zooms about the same point', () => {
      const pointer = [517, 283] as const
      const before = screenToBackdrop(HALF, pointer)

      let view = HALF
      for (let i = 0; i < 40; i += 1) view = zoomAbout(view, pointer, 1.1, WIDE)
      for (let i = 0; i < 40; i += 1) view = zoomAbout(view, pointer, 1 / 1.1, WIDE)
      const after = screenToBackdrop(view, pointer)

      expect(view.scale).toBeCloseTo(HALF.scale, 10)
      expect(after[0]).toBeCloseTo(before[0], 6)
      expect(after[1]).toBeCloseTo(before[1], 6)
    })

    it('treats a factor of one as doing nothing at all', () => {
      const zoomed = zoomAbout(HALF, [77, 88], 1, WIDE)

      expect(zoomed.scale).toBeCloseTo(HALF.scale, 12)
      expect(zoomed.originX).toBeCloseTo(HALF.originX, 10)
      expect(zoomed.originY).toBeCloseTo(HALF.originY, 10)
    })

    it('answers for a position off the backdrop rather than clamping it', () => {
      expect(screenToBackdrop(HALF, [-960, -412])).toEqual([-2000, -800])
    })

    it('answers for a zero-sized canvas, the origin being all it needs', () => {
      expect(backdropToScreen({ scale: 1, originX: 0, originY: 0 }, [0, 0])).toEqual([0, 0])
    })
  })
})
