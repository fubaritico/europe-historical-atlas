import { describe, expect, it } from 'vitest'

import { blurCoverage, fillTriangle, framePixel, groundPoint } from './silhouette'

/** A sun straight overhead, the shadows' axis toward the east: a point lands under itself, `s` is `x`, `t` is `z`. */
const OVERHEAD = { x: 0, z: 0, y: 0, axis: [1, 0] as const, fall: [0, -1, 0] as const }

describe('silhouette', () => {
  describe('happy path', () => {
    it('lands a point under an overhead sun right under it, in the shadow’s frame', () => {
      expect(groundPoint(3, 5, 2, OVERHEAD)).toEqual([3, 2])
    })

    it('fills the pixels whose centres a triangle holds, and none outside', () => {
      const coverage = new Float32Array(16)
      // The lower-left half of a 4 × 4 grid.
      fillTriangle(coverage, 4, 4, [0, 0, 0, 4, 4, 4])
      expect(coverage[3 * 4 + 0]).toBe(1)
      expect(coverage[0 * 4 + 3]).toBe(0)
    })
  })

  describe('variants', () => {
    it('slides a raised point along a slanting light, as far as its height over the ground', () => {
      // Light falling at 45° toward the east: a point one unit up lands one unit east.
      const slant = { ...OVERHEAD, fall: [Math.SQRT1_2, -Math.SQRT1_2, 0] as const }
      const [s, t] = groundPoint(0, 1, 0, slant)
      expect(s).toBeCloseTo(1)
      expect(t).toBeCloseTo(0)
    })

    it('fills a triangle whichever way it winds', () => {
      const one = new Float32Array(16)
      const other = new Float32Array(16)
      fillTriangle(one, 4, 4, [0, 0, 0, 4, 4, 4])
      fillTriangle(other, 4, 4, [0, 0, 4, 4, 0, 4])
      expect(Array.from(other)).toEqual(Array.from(one))
    })

    it('softens an edge by the blur, and leaves the grid as it is with none', () => {
      const coverage = new Float32Array(9)
      coverage[4] = 1
      expect(Array.from(blurCoverage(coverage, 3, 3, 0))).toEqual(Array.from(coverage))
      const blurred = blurCoverage(coverage, 3, 3, 1)
      expect(blurred[4]).toBeGreaterThan(0)
      expect(blurred[4]).toBeLessThan(1)
      expect(blurred[0]).toBeGreaterThan(0)
    })

    it('maps the frame’s corners to the image’s corners', () => {
      const frame = { sMin: -1, sMax: 3, tHalf: 2 }
      expect(framePixel(-1, -2, frame, 8, 4)).toEqual([0, 0])
      expect(framePixel(3, 2, frame, 8, 4)).toEqual([8, 4])
    })
  })

  // L3: N/A — nothing is refused: the triangles come from the icons' own models
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('covers a pixel two triangles share once, never darker', () => {
      // The dev, 2026-10-27: « l'ombre n'est pas d'un seul dessin » — two pieces over one pixel stacked their shadows.
      const coverage = new Float32Array(16)
      fillTriangle(coverage, 4, 4, [0, 0, 0, 4, 4, 4])
      fillTriangle(coverage, 4, 4, [0, 0, 0, 4, 4, 4])
      expect(Math.max(...coverage)).toBe(1)
    })

    it('covers nothing for a triangle seen edge-on', () => {
      const coverage = new Float32Array(16)
      fillTriangle(coverage, 4, 4, [0, 0, 2, 2, 4, 4])
      expect(coverage.every((value) => value === 0)).toBe(true)
    })

    it('clips a triangle that runs past the grid', () => {
      const coverage = new Float32Array(16)
      fillTriangle(coverage, 4, 4, [-10, -10, -10, 20, 20, 20])
      expect(coverage[3 * 4 + 0]).toBe(1)
      expect(coverage).toHaveLength(16)
    })
  })
})
