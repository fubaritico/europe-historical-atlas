import { describe, expect, it } from 'vitest'

import { createHeightmap } from '@europe-historical-atlas/core/data/heightmap'
import { createLandMask } from '@europe-historical-atlas/core/data/landMask'

import { createMapSources, refreshReliefSource, shorelineMask } from './mapSources'

import type { HeightmapMeta } from '@europe-historical-atlas/core/data/heightmap'

const META: HeightmapMeta = {
  width: 4,
  height: 4,
  zoom: 5,
  bbox: { west: -10, south: 35, east: 10, north: 60 },
  min: 0,
  max: 4000,
  encoding: 'int16-le-metres',
}

/** A grid with one spike, so smoothing has something to round off. */
const spiky = (): ReturnType<typeof createHeightmap> =>
  createHeightmap(META, Int16Array.from([0, 0, 0, 0, 0, 2000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))

/** Land at 900 m everywhere, so only a mask can say where the shore is. */
const plateau = (): ReturnType<typeof createHeightmap> =>
  createHeightmap(
    META,
    Int16Array.from({ length: 16 }, () => 900)
  )

/** A mask with the sea in the west column. */
const westSea = createLandMask(
  { width: 4, height: 4, scale: 1, bbox: META.bbox, source: 'test' },
  (col) => col > 0
)

/** Smoothing alone, no shore ramp: the shaping the older tests were written against. */
const SMOOTH = { smoothing: 1, shoreRamp: 0 }

/** Neither smoothing nor ramp. */
const RAW = { smoothing: 0, shoreRamp: 0 }

describe('createMapSources', () => {
  describe('happy path', () => {
    it('starts with nothing loaded', () => {
      const sources = createMapSources()
      expect(sources.heightmap).toBeNull()
      expect(sources.riverData).toHaveLength(0)
    })
  })

  describe('variants', () => {
    it('hands out independent records', () => {
      const first = createMapSources()
      first.riverData.push({} as never)
      expect(createMapSources().riverData).toHaveLength(0)
    })
  })

  // L3 (managed errors) and L4 (unmanaged errors): N/A — it takes no argument and reads nothing.

  describe('edge cases', () => {
    it('is writable, being the record every loader fills in', () => {
      const sources = createMapSources()
      sources.heightmap = spiky()
      expect(sources.heightmap).not.toBeNull()
    })
  })
})

describe('refreshReliefSource', () => {
  describe('happy path', () => {
    it('derives the grid overlays sample', () => {
      const sources = createMapSources()
      sources.heightmap = spiky()
      expect(refreshReliefSource(sources, SMOOTH, 0)).toBe(sources.reliefSource)
      expect(sources.reliefSource).not.toBeNull()
    })
  })

  describe('variants', () => {
    it('rounds a spike off into its neighbours', () => {
      const sources = createMapSources()
      sources.heightmap = spiky()
      refreshReliefSource(sources, SMOOTH, 0)
      expect(sources.reliefSource?.sample(1 / 3, 1 / 3)).toBeLessThan(2000)
    })

    it('lowers the land next to the mask sea, the coast no longer a cliff', () => {
      const sources = createMapSources()
      sources.heightmap = plateau()
      sources.landMask = westSea
      refreshReliefSource(sources, { smoothing: 0, shoreRamp: 3000 }, 0)
      expect(sources.reliefSource?.data[0]).toBe(0)
      expect(sources.reliefSource?.data[1]).toBeLessThan(900)
    })

    it('ramps against the elevation threshold when the mask failed, as the coastline is traced', () => {
      // No mask: the shore is where the DEM crosses the threshold, and a 900 m plateau under a 1000 m
      // threshold is all sea — flattened, as the traced coastline would say.
      const sources = createMapSources()
      sources.heightmap = plateau()
      refreshReliefSource(sources, { smoothing: 0, shoreRamp: 3000 }, 1000)
      expect(sources.reliefSource?.data[5]).toBe(0)
    })

    it('hands back the DEM itself at zero smoothing and no ramp, allocating nothing', () => {
      const sources = createMapSources()
      const dem = spiky()
      sources.heightmap = dem
      expect(refreshReliefSource(sources, RAW, 0)).toBe(dem)
    })
  })

  describe('managed errors', () => {
    it('reports nothing while the elevation has not loaded', () => {
      const sources = createMapSources()
      expect(refreshReliefSource(sources, SMOOTH, 0)).toBeNull()
      expect(sources.reliefSource).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('clears a stale grid when the elevation goes away', () => {
      // Teardown nulls the heightmap; a relief source left behind would drape overlays on a dead grid.
      const sources = createMapSources()
      sources.heightmap = spiky()
      refreshReliefSource(sources, SMOOTH, 0)
      sources.heightmap = null
      refreshReliefSource(sources, SMOOTH, 0)
      expect(sources.reliefSource).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('survives a smoothing radius wider than the grid', () => {
      const sources = createMapSources()
      sources.heightmap = spiky()
      expect(refreshReliefSource(sources, { smoothing: 99, shoreRamp: 0 }, 0)).not.toBeNull()
    })
  })
})

describe('shorelineMask', () => {
  describe('happy path', () => {
    it('is the land mask when it loaded', () => {
      const sources = createMapSources()
      sources.heightmap = plateau()
      sources.landMask = westSea
      expect(shorelineMask(sources, 0)).toBe(westSea)
    })
  })

  describe('variants', () => {
    it('thresholds the elevation when the mask failed', () => {
      const sources = createMapSources()
      sources.heightmap = spiky()
      const mask = shorelineMask(sources, 1000)
      expect(mask?.isLand(1 / 3, 1 / 3)).toBe(true)
      expect(mask?.isLand(0, 0)).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('has nothing to say before the elevation has loaded', () => {
      expect(shorelineMask(createMapSources(), 0)).toBeNull()
    })
  })

  // L4 (unmanaged errors): N/A — it reads two fields and builds nothing that can fail.

  describe('edge cases', () => {
    it('prefers the mask even when the elevation is missing', () => {
      const sources = createMapSources()
      sources.landMask = westSea
      expect(shorelineMask(sources, 0)).toBe(westSea)
    })
  })
})

describe('refreshReliefSource, derived once per set of inputs', () => {
  it('hands back the same grid when nothing changed, so startup does not ramp the shore twice', () => {
    const sources = createMapSources()
    sources.heightmap = plateau()
    sources.landMask = westSea
    const first = refreshReliefSource(sources, { smoothing: 0, shoreRamp: 3000 }, 0)
    expect(refreshReliefSource(sources, { smoothing: 0, shoreRamp: 3000 }, 0)).toBe(first)
  })

  it('derives again when the ramp, the mask or the elevation changes', () => {
    const sources = createMapSources()
    sources.heightmap = plateau()
    sources.landMask = westSea
    const first = refreshReliefSource(sources, { smoothing: 0, shoreRamp: 3000 }, 0)
    expect(refreshReliefSource(sources, { smoothing: 0, shoreRamp: 1000 }, 0)).not.toBe(first)
    sources.landMask = null
    const unmasked = refreshReliefSource(sources, { smoothing: 0, shoreRamp: 1000 }, 0)
    expect(refreshReliefSource(sources, { smoothing: 0, shoreRamp: 1000 }, 950)).not.toBe(unmasked)
    sources.heightmap = plateau()
    expect(refreshReliefSource(sources, { smoothing: 0, shoreRamp: 1000 }, 950)).not.toBe(unmasked)
  })

  it('ignores the threshold while a mask decides the shore', () => {
    const sources = createMapSources()
    sources.heightmap = plateau()
    sources.landMask = westSea
    const first = refreshReliefSource(sources, { smoothing: 0, shoreRamp: 3000 }, 0)
    expect(refreshReliefSource(sources, { smoothing: 0, shoreRamp: 3000 }, 500)).toBe(first)
  })
})
