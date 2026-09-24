import { describe, expect, it } from 'vitest'

import { createHeightmap } from '@europe-atlas/core/data/heightmap'

import { createMapSources, refreshReliefSource } from './mapSources'

import type { HeightmapMeta } from '@europe-atlas/core/data/heightmap'

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
      expect(refreshReliefSource(sources, 1)).toBe(sources.reliefSource)
      expect(sources.reliefSource).not.toBeNull()
    })
  })

  describe('variants', () => {
    it('rounds a spike off into its neighbours', () => {
      const sources = createMapSources()
      sources.heightmap = spiky()
      refreshReliefSource(sources, 1)
      expect(sources.reliefSource?.sample(1 / 3, 1 / 3)).toBeLessThan(2000)
    })

    it('hands back the DEM itself at zero smoothing, allocating nothing', () => {
      const sources = createMapSources()
      const dem = spiky()
      sources.heightmap = dem
      expect(refreshReliefSource(sources, 0)).toBe(dem)
    })
  })

  describe('managed errors', () => {
    it('reports nothing while the elevation has not loaded', () => {
      const sources = createMapSources()
      expect(refreshReliefSource(sources, 1)).toBeNull()
      expect(sources.reliefSource).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('clears a stale grid when the elevation goes away', () => {
      // Teardown nulls the heightmap; a relief source left behind would drape overlays on a dead grid.
      const sources = createMapSources()
      sources.heightmap = spiky()
      refreshReliefSource(sources, 1)
      sources.heightmap = null
      refreshReliefSource(sources, 1)
      expect(sources.reliefSource).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('survives a smoothing radius wider than the grid', () => {
      const sources = createMapSources()
      sources.heightmap = spiky()
      expect(refreshReliefSource(sources, 99)).not.toBeNull()
    })
  })
})
