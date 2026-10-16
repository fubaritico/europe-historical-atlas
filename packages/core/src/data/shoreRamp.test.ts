import { describe, expect, it } from 'vitest'

import { createHeightmap } from './heightmap'
import { createLandMask } from './landMask'
import { distanceToSea, landFractions, shoreFactor, taperHeightmapToShore } from './shoreRamp'

import type { HeightmapMeta } from './heightmap'
import type { LandMask } from './landMask'

/** Kilometres in one cell of {@link EQUATOR}: one degree of longitude at the equator. */
const KM = 111.32

/** One row at the equator, one degree per cell, so a cell is {@link KM} wide. */
const EQUATOR: HeightmapMeta = {
  width: 6,
  height: 1,
  zoom: 5,
  bbox: { west: 0, south: -1, east: 5, north: 0 },
  min: -50,
  max: 1000,
  encoding: 'int16-le-metres',
}

/**
 * A mask on the grid's own cells.
 * @param meta - the grid
 * @param land - whether a cell is land
 * @param scale - mask cells per grid cell
 * @returns the mask
 */
const maskOf = (
  meta: HeightmapMeta,
  land: (col: number, row: number) => boolean,
  scale = 1
): LandMask =>
  createLandMask(
    {
      width: meta.width * scale,
      height: meta.height * scale,
      scale,
      bbox: meta.bbox,
      source: 'test',
    },
    land
  )

/** Sea in the first cell, land everywhere else. */
const westSea = maskOf(EQUATOR, (col) => col > 0)

describe('taperHeightmapToShore', () => {
  describe('happy path', () => {
    it('lowers the land next to the sea and leaves the land beyond the ramp untouched', () => {
      const dem = createHeightmap(EQUATOR, Int16Array.from([0, 1000, 1000, 1000, 1000, 1000]))
      const out = taperHeightmapToShore(dem, westSea, 2 * KM)
      // Half a cell from the shore, a quarter of the way up the ramp.
      expect(out.data[1]).toBeCloseTo(1000 * shoreFactor(0.5 * KM, 2 * KM), 3)
      expect(out.data[1]).toBeLessThan(200)
      expect(out.data[4]).toBe(1000)
    })

    it('keeps the source metadata', () => {
      const dem = createHeightmap(EQUATOR, Int16Array.from([0, 1000, 1000, 1000, 1000, 1000]))
      expect(taperHeightmapToShore(dem, westSea, 2 * KM).meta).toBe(EQUATOR)
    })
  })

  describe('variants', () => {
    it('sets to zero a cell the DEM raises and the mask calls sea', () => {
      // The DEM and the mask disagree: without this the sea stands up out of the water.
      const dem = createHeightmap(EQUATOR, Int16Array.from([400, 1000, 1000, 1000, 1000, 1000]))
      expect(taperHeightmapToShore(dem, westSea, 2 * KM).data[0]).toBe(0)
    })

    it('leaves a land cell at or below zero as it is, a polder staying a polder', () => {
      const dem = createHeightmap(EQUATOR, Int16Array.from([0, -5, 1000, 1000, 1000, 1000]))
      expect(taperHeightmapToShore(dem, westSea, 2 * KM).data[1]).toBe(-5)
    })

    it('keeps the bathymetry under the sea', () => {
      const dem = createHeightmap(EQUATOR, Int16Array.from([-50, 1000, 1000, 1000, 1000, 1000]))
      expect(taperHeightmapToShore(dem, westSea, 2 * KM).data[0]).toBe(-50)
    })

    it('lowers more with a wider ramp', () => {
      const dem = createHeightmap(EQUATOR, Int16Array.from([0, 1000, 1000, 1000, 1000, 1000]))
      const narrow = taperHeightmapToShore(dem, westSea, 2 * KM).data[2] ?? NaN
      const wide = taperHeightmapToShore(dem, westSea, 4 * KM).data[2] ?? NaN
      expect(wide).toBeLessThan(narrow)
    })

    it('counts kilometres at the row latitude, so the same cell distance lowers more up north', () => {
      // At 60°N a degree of longitude is half as long, so one cell from the sea is half as far.
      const north: HeightmapMeta = { ...EQUATOR, bbox: { west: 0, south: 59, east: 5, north: 60 } }
      const equator = createHeightmap(EQUATOR, Int16Array.from([0, 1000, 1000, 1000, 1000, 1000]))
      const polar = createHeightmap(north, Int16Array.from([0, 1000, 1000, 1000, 1000, 1000]))
      const atEquator = taperHeightmapToShore(equator, westSea, 3 * KM).data[2] ?? NaN
      const atSixty = taperHeightmapToShore(
        polar,
        maskOf(north, (c) => c > 0),
        3 * KM
      ).data[2]
      expect(atSixty).toBeLessThan(atEquator)
    })

    it('reads a mask finer than the grid, every mask cell under a grid cell counted', () => {
      // Two mask cells per grid cell: the first grid cell covers mask cells 0 and 1.
      expect(
        landFractions(
          EQUATOR,
          maskOf(EQUATOR, (col) => col >= 1, 2)
        )[0]
      ).toBe(0.5)
      expect(
        landFractions(
          EQUATOR,
          maskOf(EQUATOR, (col) => col >= 2, 2)
        )[0]
      ).toBe(0)
      const dem = createHeightmap(EQUATOR, Int16Array.from([300, 1000, 1000, 1000, 1000, 1000]))
      const out = taperHeightmapToShore(
        dem,
        maskOf(EQUATOR, (col) => col >= 2, 2),
        2 * KM
      )
      expect(out.data[0]).toBe(0)
    })
  })

  describe('managed errors', () => {
    it('returns the source itself when the ramp is zero, allocating nothing', () => {
      const dem = createHeightmap(EQUATOR, Int16Array.from([400, 1000, 1000, 1000, 1000, 1000]))
      expect(taperHeightmapToShore(dem, westSea, 0)).toBe(dem)
    })

    it('treats a negative ramp as no ramp', () => {
      const dem = createHeightmap(EQUATOR, Int16Array.from([400, 1000, 1000, 1000, 1000, 1000]))
      expect(taperHeightmapToShore(dem, westSea, -3)).toBe(dem)
    })
  })

  describe('unmanaged errors', () => {
    it('carries a NaN elevation through rather than turning it into sea level', () => {
      // A NaN that became zero would read as a real coast; one that stays NaN reports itself.
      const dem = createHeightmap(EQUATOR, Float32Array.from([0, 1000, 1000, NaN, 1000, 1000]))
      expect(taperHeightmapToShore(dem, westSea, 2 * KM).data[3]).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('lowers nothing on a grid with no sea at all', () => {
      const dem = createHeightmap(EQUATOR, Int16Array.from([700, 1000, 1000, 1000, 1000, 1000]))
      const out = taperHeightmapToShore(
        dem,
        maskOf(EQUATOR, () => true),
        2 * KM
      )
      expect(Array.from(out.data)).toEqual([700, 1000, 1000, 1000, 1000, 1000])
    })

    it('flattens a grid that is all sea', () => {
      const dem = createHeightmap(EQUATOR, Int16Array.from([700, 1000, 1000, 1000, 1000, 1000]))
      const out = taperHeightmapToShore(
        dem,
        maskOf(EQUATOR, () => false),
        2 * KM
      )
      expect(Array.from(out.data)).toEqual([0, 0, 0, 0, 0, 0])
    })

    it('handles a one-cell grid', () => {
      const one: HeightmapMeta = { ...EQUATOR, width: 1 }
      const dem = createHeightmap(one, Int16Array.from([900]))
      expect(
        taperHeightmapToShore(
          dem,
          maskOf(one, () => true),
          2 * KM
        ).data[0]
      ).toBe(900)
    })
  })
})

describe('distanceToSea', () => {
  it('counts a diagonal step longer than a straight one', () => {
    // 3×3, sea in the top-left corner only.
    const fractions = Float32Array.from([0, 1, 1, 1, 1, 1, 1, 1, 1])
    const d = distanceToSea(fractions, 3, 3)
    expect(d[1]).toBe(1)
    expect(d[4]).toBeCloseTo(Math.SQRT2, 6)
    expect(d[8]).toBeCloseTo(2 * Math.SQRT2, 6)
  })

  it('reaches a cell whose nearest sea lies after it, through the backward pass', () => {
    const d = distanceToSea(Float32Array.from([1, 1, 1, 0]), 4, 1)
    expect(Array.from(d)).toEqual([3, 2, 1, 0])
  })

  it('reads a half-land cell as sea', () => {
    expect(distanceToSea(Float32Array.from([0.49, 1]), 2, 1)[0]).toBe(0)
    expect(distanceToSea(Float32Array.from([0.5, 1]), 2, 1)[0]).toBe(Infinity)
  })
})

describe('shoreFactor', () => {
  it('is zero at the shore, one at the ramp width and beyond, with no crease at either end', () => {
    expect(shoreFactor(0, 10)).toBe(0)
    expect(shoreFactor(5, 10)).toBe(0.5)
    expect(shoreFactor(10, 10)).toBe(1)
    expect(shoreFactor(40, 10)).toBe(1)
    // Smoothstep: flat at both ends, so the ramp meets the coast and the inland relief without a kink.
    expect(shoreFactor(0.1, 10)).toBeLessThan(0.01 * 3)
    expect(1 - shoreFactor(9.9, 10)).toBeLessThan(0.01 * 3)
  })

  it('keeps everything when there is no ramp', () => {
    expect(shoreFactor(0, 0)).toBe(1)
  })
})
