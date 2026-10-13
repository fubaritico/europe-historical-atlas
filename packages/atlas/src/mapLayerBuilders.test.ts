import { describe, expect, it } from 'vitest'

import { patternForPair } from './mapLayerBuilders'
import { createMapSources } from './mapSources'

import type { LayerContext } from './mapLayerContext'
import type { MapSources } from './mapSources'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'

const REGIONS = {
  year: 1500,
  regions: [
    { name: 'A', subjectTo: null },
    { name: 'B', subjectTo: null },
  ],
} as unknown as RegionSet

/** The one field `patternForPair` reads; the rest of the context is the scene's. */
function contextOver(sources: MapSources): LayerContext {
  return { sources } as unknown as LayerContext
}

describe('patternForPair', () => {
  describe('happy path', () => {
    it('draws an authored year’s group in the pattern filed for it', () => {
      const sources = createMapSources()
      sources.regionSet = REGIONS
      sources.borderPatterns = new Map([['0:1', 'double']])

      expect(patternForPair(contextOver(sources), [0, 1])).toBe('double')
    })
  })

  describe('variants', () => {
    it('looks a payload year’s pair up by name', () => {
      const sources = createMapSources()
      sources.regionSet = REGIONS

      expect(patternForPair(contextOver(sources), [0, 1])).toBe('solid')
    })

    it('reads the authored pattern even with no polity named under the index', () => {
      const sources = createMapSources()
      sources.borderPatterns = new Map([['4:4', 'dashed']])

      expect(patternForPair(contextOver(sources), [4, 4])).toBe('dashed')
    })
  })

  describe('managed errors', () => {
    // Every authored group is filed with a pattern: a miss is a defect, said rather than drawn solid.
    it('refuses an authored group filed with no pattern', () => {
      const sources = createMapSources()
      sources.regionSet = REGIONS
      sources.borderPatterns = new Map()

      expect(() => patternForPair(contextOver(sources), [0, 1])).toThrow(/no pattern filed/)
    })
  })

  // L4: N/A — a lookup over two maps, nothing awaited or caught.

  describe('edge cases', () => {
    it('draws solid before any year has loaded', () => {
      expect(patternForPair(contextOver(createMapSources()), [0, 1])).toBe('solid')
    })
  })
})
