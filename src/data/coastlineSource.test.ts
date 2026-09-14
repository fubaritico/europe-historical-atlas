import { describe, expect, it } from 'vitest'

import { createDemCoastlineSource } from './coastlineSource'
import { createHeightmap } from './heightmap'

import type { HeightmapMeta } from './heightmap'

/** Build minimal metadata for a test grid. */
function meta(width: number, height: number): HeightmapMeta {
  return {
    width,
    height,
    zoom: 5,
    bbox: { west: 0, south: 0, east: 1, north: 1 },
    min: -100,
    max: 100,
    encoding: 'int16-le-metres',
  }
}

/** A 2×2 grid from its four corners (row-major: tl, tr, bl, br). */
function grid2x2(tl: number, tr: number, bl: number, br: number) {
  return createHeightmap(meta(2, 2), new Int16Array([tl, tr, bl, br]))
}

describe('createDemCoastlineSource', () => {
  describe('happy path', () => {
    it('extracts one segment when a single corner is land', () => {
      // Land at TL only → the shoreline clips the TL corner (left↔top edges).
      const segments = createDemCoastlineSource(grid2x2(100, -100, -100, -100), {
        seaLevel: 0,
      }).load()
      expect(segments).toHaveLength(1)
      const seg = segments[0]
      if (!seg) throw new Error('expected one segment')
      const [a, b] = seg
      // crossing at the midpoint of each incident edge (100 → −100 crosses 0 at t=0.5)
      expect(a).toEqual({ u: 0, v: 0.5 }) // left edge
      expect(b).toEqual({ u: 0.5, v: 0 }) // top edge
    })
  })

  describe('variants', () => {
    it('extracts a horizontal split when the two bottom corners are land', () => {
      const segments = createDemCoastlineSource(grid2x2(-100, -100, 100, 100), {
        seaLevel: 0,
      }).load()
      expect(segments).toHaveLength(1)
      const seg = segments[0]
      if (!seg) throw new Error('expected one segment')
      const [a, b] = seg
      expect(a).toEqual({ u: 0, v: 0.5 }) // left edge
      expect(b).toEqual({ u: 1, v: 0.5 }) // right edge
    })

    it('emits two segments for a saddle (diagonal land corners)', () => {
      // Land at TL + BR (code 10) → two segments, one per land corner.
      const segments = createDemCoastlineSource(grid2x2(100, -100, -100, 100), {
        seaLevel: 0,
      }).load()
      expect(segments).toHaveLength(2)
    })

    it('follows a non-zero sea level', () => {
      // With seaLevel 300, only the 500 corner is land → one segment.
      const segments = createDemCoastlineSource(grid2x2(500, 100, 100, 100), {
        seaLevel: 300,
      }).load()
      expect(segments).toHaveLength(1)
    })
  })

  describe('managed errors', () => {
    it('returns no segments for an all-sea grid', () => {
      expect(
        createDemCoastlineSource(grid2x2(-100, -100, -100, -100), { seaLevel: 0 }).load()
      ).toHaveLength(0)
    })

    it('returns no segments for an all-land grid', () => {
      expect(
        createDemCoastlineSource(grid2x2(100, 100, 100, 100), { seaLevel: 0 }).load()
      ).toHaveLength(0)
    })
  })

  // L4 (unmanaged errors): N/A — pure synchronous extraction over a typed array; no async, no I/O.

  describe('edge cases', () => {
    it('returns no segments for a grid too small to hold a cell (1×1)', () => {
      const hm = createHeightmap(meta(1, 1), new Int16Array([100]))
      expect(createDemCoastlineSource(hm, { seaLevel: 0 }).load()).toHaveLength(0)
    })

    it('scans every cell of a larger grid (a central island yields a closed loop of 4 segments)', () => {
      // 3×3 with a single land pixel in the centre → 4 boundary cells each contribute one segment.
      const data = new Int16Array(9).fill(-100)
      data[4] = 100 // centre
      const hm = createHeightmap(meta(3, 3), data)
      expect(createDemCoastlineSource(hm, { seaLevel: 0 }).load()).toHaveLength(4)
    })
  })
})
