import { describe, expect, it } from 'vitest'

import { shadowAlpha, shadowDensity, shadowFrame } from './shadowAlpha'

import type { ShadowFootprint } from './shadowFootprint'

/** A pin's shadow: a stem from 0 to 10, a disc of radius 2 at 10, each edge fading over its own radius. */
const PIN: ShadowFootprint = {
  capsules: [
    { from: 0, to: 10, radius: 0.5 },
    { from: 10, to: 10, radius: 2 },
  ],
  softness: 1,
}

describe('shadowAlpha', () => {
  describe('happy path', () => {
    it('frames the footprint with its soft edge, behind the foot and past the tip', () => {
      expect(shadowFrame(PIN)).toEqual({ sMin: -1, sMax: 14, tHalf: 4 })
    })

    it('is fully dark inside a stroke and clear past its soft edge', () => {
      expect(shadowDensity(10, 0, PIN)).toBe(1)
      expect(shadowDensity(5, 0, PIN)).toBe(1)
      expect(shadowDensity(5, 1.6, PIN)).toBe(0)
    })

    it('paints black pixels whose alpha is the darkness, dark at the head’s shadow and clear in a corner', () => {
      const frame = shadowFrame(PIN)
      // 30 pixels along 15 units, 16 across 8: half a unit each; the head's centre (s 10, t 0) near column 21, row 8.
      const pixels = shadowAlpha(PIN, frame, 30, 16)
      const at = (col: number, row: number): number[] =>
        Array.from(pixels.slice((row * 30 + col) * 4, (row * 30 + col) * 4 + 4))
      expect(at(21, 8)).toEqual([0, 0, 0, 255])
      expect(at(0, 0)).toEqual([0, 0, 0, 0])
    })
  })

  describe('variants', () => {
    it('fades across the soft edge, between dark and clear', () => {
      const density = shadowDensity(5, 0.75, PIN)
      expect(density).toBeGreaterThan(0)
      expect(density).toBeLessThan(1)
    })

    it('draws a hard edge when the footprint has no softness', () => {
      const hard = { ...PIN, softness: 0 }
      expect(shadowDensity(5, 0.4, hard)).toBe(1)
      expect(shadowDensity(5, 0.6, hard)).toBe(0)
    })
  })

  // L3: N/A — nothing is refused: the footprints are built from the pin's constants
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('fades a thin stroke over its own width, not over the widest stroke’s', () => {
      // The stem's edge (radius 0.5) is clear one radius out, while the head's (radius 2) still shades there.
      expect(shadowDensity(5, 1.1, PIN)).toBe(0)
      expect(shadowDensity(10, 2.5, PIN)).toBeGreaterThan(0)
    })

    it('gives the darkest of two overlapping strokes, never their sum', () => {
      // Where the stem enters the head's disc, both cover the point: still one, not two.
      expect(shadowDensity(9.5, 0, PIN)).toBe(1)
    })

    it('frames a footprint with no stroke as a point', () => {
      expect(shadowFrame({ capsules: [], softness: 1 })).toEqual({ sMin: 0, sMax: 0, tHalf: 0 })
    })
  })
})
