import { describe, expect, it } from 'vitest'

import {
  EUROPE_SILHOUETTE_HEIGHT,
  EUROPE_SILHOUETTE_PATH,
  EUROPE_SILHOUETTE_WIDTH,
} from './europeSilhouette'

/** Every coordinate pair in the path, in order. */
function points(): [number, number][] {
  return [...EUROPE_SILHOUETTE_PATH.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(
    (match) => [Number(match[1]), Number(match[2])]
  )
}

// This file is generated. What is asserted here is not the shape — the generator's own `--ascii` and
// `verify.mjs` modes are what a human looks at — but that a regeneration has not produced something
// structurally broken: an empty path, a single blob, or coordinates outside the box they are drawn in.
describe('EUROPE_SILHOUETTE_PATH', () => {
  describe('happy path', () => {
    it('is a set of closed subpaths', () => {
      const subpaths = EUROPE_SILHOUETTE_PATH.split('M').filter((part) => part.length > 0)
      expect(subpaths.length).toBeGreaterThan(5) // the mainland, plus islands
      for (const subpath of subpaths) expect(subpath.endsWith('Z')).toBe(true)
    })

    it('draws islands, not one undifferentiated blob', () => {
      // Britain, Ireland, Sicily, Sardinia, Corsica, Crete and the rest are what make it read as Europe
      // rather than as a continent-shaped smear.
      expect(EUROPE_SILHOUETTE_PATH.split('M').length - 1).toBeGreaterThanOrEqual(10)
    })
  })

  describe('variants', () => {
    it('is drawn in a box close to square, as a near-square emblem', () => {
      const aspect = EUROPE_SILHOUETTE_WIDTH / EUROPE_SILHOUETTE_HEIGHT
      expect(aspect).toBeGreaterThan(0.75)
      expect(aspect).toBeLessThan(1.35)
    })
  })

  // L3/L4: N/A — a generated constant. A malformed path is caught here, not handled at runtime.

  describe('edge cases', () => {
    it('keeps every coordinate inside the box it declares', () => {
      // A point outside the viewBox is clipped silently by the browser, so a tracing bug would show as a
      // shape with a straight edge rather than as an error.
      for (const [x, y] of points()) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(EUROPE_SILHOUETTE_WIDTH)
        expect(y).toBeLessThanOrEqual(EUROPE_SILHOUETTE_HEIGHT)
      }
    })

    it('spans most of its box, rather than sitting in a corner', () => {
      const all = points()
      const xs = all.map(([x]) => x)
      const ys = all.map(([, y]) => y)
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(EUROPE_SILHOUETTE_WIDTH * 0.9)
      expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(EUROPE_SILHOUETTE_HEIGHT * 0.9)
    })
  })
})
