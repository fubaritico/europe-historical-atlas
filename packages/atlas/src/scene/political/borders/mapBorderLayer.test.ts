import { describe, expect, it } from 'vitest'

import { VASSAL_HAND_WEIGHT } from '@europe-historical-atlas/core/data/borderHands'

import { createMapSources } from '../../../sources/mapSources'
import { createDevState } from '../../../tunables/devState'

import { VASSAL_BORDER_PX, borderStrokeStyle, levelForPair, patternForPair } from './mapBorderLayer'

import type { MapSources } from '../../../sources/mapSources'
import type { LayerContext } from '../../layers/layerContext'
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

describe('levelForPair', () => {
  describe('happy path', () => {
    it('reads an authored year’s group at the split level filed for it', () => {
      const sources = createMapSources()
      sources.borderLevels = new Map([['2:2', 1]])

      expect(levelForPair(contextOver(sources), [2, 2])).toBe(1)
    })
  })

  describe('variants', () => {
    it('shows every line of a payload year at level 0', () => {
      const sources = createMapSources()
      sources.regionSet = REGIONS

      expect(levelForPair(contextOver(sources), [0, 1])).toBe(0)
    })
  })

  describe('managed errors', () => {
    // Every authored group is filed with a level: a miss is a defect, said rather than shown at 0.
    it('refuses an authored group filed with no level', () => {
      const sources = createMapSources()
      sources.borderLevels = new Map()

      expect(() => levelForPair(contextOver(sources), [0, 0])).toThrow(/no split level filed/)
    })
  })

  // L4: N/A — a lookup over one map, nothing awaited or caught.

  describe('edge cases', () => {
    it('answers level 0 before any year has loaded', () => {
      expect(levelForPair(contextOver(createMapSources()), [0, 1])).toBe(0)
    })
  })
})

// ATLAS-398, the dev, 2026-11-09: the vassals' dotted border "a bit thicker", at core's weight — no panel setting.
describe('borderStrokeStyle', () => {
  describe('happy path', () => {
    it('draws the vassals’ border at core’s weight: 2.25 px wide, 2.25 px dots, 3.75 px gaps', () => {
      const style = borderStrokeStyle(createDevState())
      expect([style.vassalWidth, style.vassalDotSize, style.vassalDotGap]).toEqual([
        2.25, 2.25, 3.75,
      ])
    })
  })

  describe('variants', () => {
    // Mutation: the width scaled and the dots left at weight one would turn the dots into dashes.
    it('keeps the dots in proportion to the width', () => {
      const style = borderStrokeStyle(createDevState())
      expect(style.vassalDotSize / style.vassalWidth).toBe(
        VASSAL_BORDER_PX.dot / VASSAL_BORDER_PX.width
      )
      expect(style.vassalWidth).toBe(VASSAL_BORDER_PX.width * VASSAL_HAND_WEIGHT)
    })
  })

  // L3–L5: N/A — constants multiplied, nothing to refuse, no async, no boundary.
})
