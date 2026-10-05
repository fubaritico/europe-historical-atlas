import { describe, expect, it } from 'vitest'

import { createHeightmap } from '@europe-historical-atlas/core/data/heightmap'
import { createElevationLandMask } from '@europe-historical-atlas/core/data/landMask'
import { DEFAULT_TERRAIN_OPTIONS } from '@europe-historical-atlas/core/pipeline/terrainOptions'

import { RENDER_FRAME } from '../view/backdropFrame'

import { bakeBackdrop } from './backdrop'

import type { Heightmap } from '@europe-historical-atlas/core/data/heightmap'

/**
 * A grid small enough to bake in a test — eight by six, half sea and half land.
 *
 * The real DEM is 1280×1164 and baking it composites 1.5 million pixels; what is asserted here is the
 * wiring and the size arithmetic, which a tiny grid shows exactly as well.
 * @returns the heightmap
 */
function tinyDem(): Heightmap {
  const width = 8
  const height = 6
  const data = new Int16Array(width * height)
  for (let i = 0; i < data.length; i += 1) data[i] = i % 2 === 0 ? -200 : 400
  return createHeightmap(
    {
      width,
      height,
      zoom: 5,
      bbox: RENDER_FRAME.bounds,
      min: -200,
      max: 400,
      encoding: 'int16-le-metres',
    },
    data
  )
}

describe('bakeBackdrop', () => {
  describe('happy path', () => {
    it('bakes four bytes per pixel, at the size the options ask for', () => {
      const dem = tinyDem()

      const baked = bakeBackdrop(dem, null)

      expect(baked.rgba).toHaveLength(baked.width * baked.height * 4)
      expect(baked.width).toBeGreaterThanOrEqual(dem.meta.width)
      expect(baked.height).toBeGreaterThanOrEqual(dem.meta.height)
    })

    it('paints something, rather than handing back a blank buffer', () => {
      const baked = bakeBackdrop(tinyDem(), null)

      expect(baked.rgba.some((byte) => byte !== 0)).toBe(true)
    })

    it('is opaque everywhere — the editor draws over it, never through it', () => {
      const baked = bakeBackdrop(tinyDem(), null)

      for (let i = 3; i < baked.rgba.length; i += 4) {
        expect(baked.rgba[i]).toBe(255)
      }
    })
  })

  describe('variants', () => {
    it('takes a land mask when there is one, and manages without', () => {
      const dem = tinyDem()
      const mask = createElevationLandMask(dem, 0)

      const withMask = bakeBackdrop(dem, mask)
      const without = bakeBackdrop(dem, null)

      expect(withMask.width).toBe(without.width)
      expect(withMask.rgba).toHaveLength(without.rgba.length)
    })

    it('follows the options it is given, defaulting to the atlas’s own', () => {
      const dem = tinyDem()

      const bigger = bakeBackdrop(dem, null, { ...DEFAULT_TERRAIN_OPTIONS, supersample: 3 })
      const normal = bakeBackdrop(dem, null)

      expect(bigger.width).toBeGreaterThan(normal.width)
    })

    it('bakes bare terrain: the same pixels whatever year is open, there being no tint', () => {
      // The political tint is cleared by never installing one — `bakeTerrainPixels` builds the tint seam
      // only when handed a raster, and this passes `null`. So there is no state to clear and no
      // `clearPolitical` call to forget.
      const first = bakeBackdrop(tinyDem(), null)
      const second = bakeBackdrop(tinyDem(), null)

      expect(second.rgba).toEqual(first.rgba)
    })
  })

  describe('managed errors', () => {
    it('bakes a one-cell grid without special-casing it', () => {
      const dem = createHeightmap(
        {
          width: 1,
          height: 1,
          zoom: 5,
          bbox: RENDER_FRAME.bounds,
          min: 0,
          max: 0,
          encoding: 'int16-le-metres',
        },
        new Int16Array([0])
      )

      const baked = bakeBackdrop(dem, null)

      expect(baked.rgba).toHaveLength(baked.width * baked.height * 4)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A for async — the bake awaits nothing and catches nothing. It is synchronous and total:
    // every cell of the grid produces a pixel, so there is no partial result to guard against.
    it('is synchronous, so there is no half-baked buffer to observe', () => {
      const baked = bakeBackdrop(tinyDem(), null)

      expect(baked.rgba).toBeInstanceOf(Uint8Array)
    })
  })

  describe('edge cases', () => {
    it('costs what the supersample says, which is the lever on the bake’s price', () => {
      const dem = tinyDem()

      const one = bakeBackdrop(dem, null, { ...DEFAULT_TERRAIN_OPTIONS, supersample: 1 })
      const two = bakeBackdrop(dem, null, { ...DEFAULT_TERRAIN_OPTIONS, supersample: 2 })

      // Twice the samples per axis is four times the pixels. The real grid at supersample 2 is
      // 2560×2328, which is what `known-issues` warns may exceed a guaranteed WebGL texture size — a
      // concern for the atlas's GPU path, not for a 2D context.
      expect(two.rgba.length).toBe(one.rgba.length * 4)
    })
  })
})
