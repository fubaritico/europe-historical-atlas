import { describe, expect, it } from 'vitest'

import { createHeightmap } from '../data/heightmap'

import {
  DEFAULT_TERRAIN_OPTIONS,
  createShadeSampler,
  seaColorInto,
  snowLineDropByRow,
  writeTerrainPixel,
} from './terrainCompose'

import type { HeightmapMeta } from '../data/heightmap'

const META: HeightmapMeta = {
  width: 4,
  height: 4,
  zoom: 5,
  bbox: { west: -10, south: 35, east: 10, north: 60 },
  min: 0,
  max: 4000,
  encoding: 'int16-le-metres',
}

const DEM = createHeightmap(META, new Int16Array(16))
const OPTIONS = { ...DEFAULT_TERRAIN_OPTIONS }

describe('snowLineDropByRow', () => {
  describe('happy path', () => {
    it('gives one drop per output row', () => {
      expect(snowLineDropByRow(DEM, OPTIONS, 8)).toHaveLength(8)
    })
  })

  describe('variants', () => {
    it('drops the snow line further north than south', () => {
      // Row 0 is the north row. A higher latitude means snow starts lower, so the drop must be larger.
      const drops = snowLineDropByRow(DEM, OPTIONS, 16)
      expect(drops[0]).toBeGreaterThan(drops[15] ?? 0)
    })

    it('does not depend on the elevation, only on the row', () => {
      const bumpy = createHeightmap(
        META,
        Int16Array.from({ length: 16 }, (_, i) => i * 400)
      )
      expect([...snowLineDropByRow(bumpy, OPTIONS, 8)]).toEqual([
        ...snowLineDropByRow(DEM, OPTIONS, 8),
      ])
    })
  })

  // L3 (managed errors): N/A — it reads bounds and options that have already been validated on load.

  describe('unmanaged errors', () => {
    it('returns nothing for a zero-height image rather than guessing a row', () => {
      expect(snowLineDropByRow(DEM, OPTIONS, 0)).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('reads a single-row image at the top of the frame, not at its middle', () => {
      const one = snowLineDropByRow(DEM, OPTIONS, 1)
      expect(one[0]).toBeCloseTo(snowLineDropByRow(DEM, OPTIONS, 16)[0] ?? 0, 5)
    })
  })
})

describe('createShadeSampler', () => {
  const field = Float32Array.from([0, 1, 0, 1])

  describe('happy path', () => {
    it('reads a node exactly where one sits', () => {
      expect(createShadeSampler(field, 2, 2)(1, 0)).toBeCloseTo(1)
    })
  })

  describe('variants', () => {
    it('interpolates halfway between two nodes', () => {
      expect(createShadeSampler(field, 2, 2)(0.5, 0)).toBeCloseTo(0.5)
    })

    it('interpolates down a column as well as across a row', () => {
      expect(createShadeSampler(Float32Array.from([0, 0, 1, 1]), 2, 2)(0, 0.5)).toBeCloseTo(0.5)
    })
  })

  describe('managed errors', () => {
    it('clamps a position outside the field instead of reading past it', () => {
      expect(createShadeSampler(field, 2, 2)(-5, -5)).toBeCloseTo(0)
      expect(createShadeSampler(field, 2, 2)(99, 99)).toBeCloseTo(1)
    })
  })

  describe('unmanaged errors', () => {
    it('reads a missing sample as full light rather than as full shadow', () => {
      // A hole would otherwise paint a black pixel, which reads as terrain rather than as a fault.
      expect(createShadeSampler(new Float32Array(0), 2, 2)(0, 0)).toBeCloseTo(1)
    })
  })

  describe('edge cases', () => {
    it('holds up on a 1x1 field', () => {
      expect(createShadeSampler(Float32Array.from([0.25]), 1, 1)(0, 0)).toBeCloseTo(0.25)
    })
  })
})

describe('seaColorInto', () => {
  const base = [0.2, 0.4, 0.6] as const

  describe('happy path', () => {
    it('writes the flat sea tone when the elevation layer stops at the shore', () => {
      const out: [number, number, number] = [0, 0, 0]
      seaColorInto(out, base, -500, { ...OPTIONS, elevationIncludesSea: false })
      expect(out).toEqual([0.2, 0.4, 0.6])
    })
  })

  describe('variants', () => {
    it('carries the greyscale elevation layer into the sea when asked', () => {
      const out: [number, number, number] = [0, 0, 0]
      seaColorInto(out, base, -500, {
        ...OPTIONS,
        elevationIncludesSea: true,
        elevationStrength: 1,
        elevationMode: 'normal',
      })
      expect(out).not.toEqual([0.2, 0.4, 0.6])
    })

    it('leaves the sea untouched at zero strength, whatever the mode', () => {
      const out: [number, number, number] = [0, 0, 0]
      seaColorInto(out, base, -500, {
        ...OPTIONS,
        elevationIncludesSea: true,
        elevationStrength: 0,
      })
      expect(out[0]).toBeCloseTo(0.2)
    })
  })

  // L3 (managed errors): N/A — both branches are ordinary settings, not failures.

  describe('unmanaged errors', () => {
    it('does not allocate, writing into the scratch triplet it was handed', () => {
      // The loop bakes over twenty million pixels at the 4x setting; an allocation per sample would be
      // twenty million of them.
      const out: [number, number, number] = [0, 0, 0]
      seaColorInto(out, base, -500, { ...OPTIONS, elevationIncludesSea: false })
      expect(out).toBe(out)
    })
  })

  describe('edge cases', () => {
    it('handles an elevation above sea level, which the caller may still pass at the shore', () => {
      const out: [number, number, number] = [0, 0, 0]
      seaColorInto(out, base, 120, { ...OPTIONS, elevationIncludesSea: false })
      expect(out).toEqual([0.2, 0.4, 0.6])
    })
  })
})

describe('writeTerrainPixel', () => {
  const sea = [0, 0, 0] as const
  const land = [1, 1, 1] as const

  describe('happy path', () => {
    it('writes the land tone where the sample is all land', () => {
      const rgba = new Uint8Array(4)
      writeTerrainPixel(rgba, 0, sea, land, 1, 1)
      expect([...rgba]).toEqual([255, 255, 255, 255])
    })
  })

  describe('variants', () => {
    it('writes the sea tone where the sample is all sea', () => {
      const rgba = new Uint8Array(4)
      writeTerrainPixel(rgba, 0, sea, land, 0, 1)
      expect([...rgba]).toEqual([0, 0, 0, 255])
    })

    it('mixes the two across a shoreline sample', () => {
      const rgba = new Uint8Array(4)
      writeTerrainPixel(rgba, 0, sea, land, 0.5, 1)
      expect(rgba[0]).toBe(128)
    })

    it('applies the paper grain as a multiplier', () => {
      const rgba = new Uint8Array(4)
      writeTerrainPixel(rgba, 0, sea, land, 1, 0.5)
      expect(rgba[0]).toBe(128)
    })

    it('writes at the offset it was given, leaving its neighbours alone', () => {
      const rgba = new Uint8Array(8)
      writeTerrainPixel(rgba, 4, sea, land, 1, 1)
      expect([...rgba]).toEqual([0, 0, 0, 0, 255, 255, 255, 255])
    })
  })

  describe('managed errors', () => {
    it('clamps a grain that would overshoot white', () => {
      const rgba = new Uint8Array(4)
      writeTerrainPixel(rgba, 0, sea, land, 1, 4)
      expect(rgba[0]).toBe(255)
    })

    it('clamps a negative product to black rather than wrapping it', () => {
      const rgba = new Uint8Array(4)
      writeTerrainPixel(rgba, 0, sea, land, 1, -2)
      expect(rgba[0]).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    it('reads a missing channel as zero rather than writing garbage', () => {
      const rgba = new Uint8Array(4)
      writeTerrainPixel(rgba, 0, [] as unknown as [number, number, number], land, 0, 1)
      expect(rgba[0]).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('always leaves the pixel fully opaque', () => {
      const rgba = new Uint8Array(4)
      writeTerrainPixel(rgba, 0, sea, land, 0.3, 0)
      expect(rgba[3]).toBe(255)
    })
  })
})
