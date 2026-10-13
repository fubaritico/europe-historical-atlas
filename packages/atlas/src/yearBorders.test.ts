import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { saveYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { createMapSources } from './mapSources'
import { settleYearBorders } from './yearBorders'

import type { RegionBorders } from '@europe-historical-atlas/core/data/regionBorders'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'

const bbox = { west: -10, south: 35, east: 10, north: 60 }

/** What the compute traced from the raster — one line, recognisable by identity. */
const TRACED: RegionBorders = {
  between: [
    {
      pair: [0, 1],
      lines: [
        [
          { u: 0.1, v: 0.1 },
          { u: 0.2, v: 0.2 },
        ],
      ],
    },
  ],
  frontier: [],
}

const PAYLOAD_YEAR: RegionSet = { year: 1500, regions: [] }

function authoredYear(): RegionSet {
  const doc = sharedBorderDocument()
  return {
    year: 1100,
    regions: [],
    authored: { year: { year: 1100, ...saveYearDocument(doc) }, bbox },
  }
}

describe('settleYearBorders', () => {
  describe('happy path', () => {
    it('draws an authored year’s borders from its anchors, each filed with its pattern', () => {
      const sources = createMapSources()

      settleYearBorders(sources, authoredYear(), TRACED)

      expect(sources.derivedBorders).not.toBe(TRACED)
      expect(sources.derivedBorders?.between).toHaveLength(1)
      expect(sources.borderPatterns?.get('0:0')).toBe('solid')
    })
  })

  describe('variants', () => {
    it('keeps the raster’s lines for a year read from the payloads, with no pattern of its own', () => {
      const sources = createMapSources()

      settleYearBorders(sources, PAYLOAD_YEAR, TRACED)

      expect(sources.derivedBorders).toBe(TRACED)
      expect(sources.borderPatterns).toBeNull()
    })

    it('forgets the previous authored year’s patterns when a payload year follows it', () => {
      const sources = createMapSources()
      settleYearBorders(sources, authoredYear(), TRACED)

      settleYearBorders(sources, PAYLOAD_YEAR, TRACED)

      expect(sources.borderPatterns).toBeNull()
    })
  })

  describe('managed errors', () => {
    // The mask failed: no frontier against unclaimed ground, as the raster derivation does.
    it('draws the shared limit and no frontier without a land mask', () => {
      const sources = createMapSources()

      settleYearBorders(sources, authoredYear(), TRACED)

      expect(sources.derivedBorders?.frontier).toEqual([])
    })
  })

  // L4: N/A — nothing is awaited or caught; a malformed year was refused when it was read.

  describe('edge cases', () => {
    it('settles an authored year with no claim to no line at all', () => {
      const sources = createMapSources()
      const empty = authoredYear()
      if (empty.authored) empty.authored.year.polities.claims = []

      settleYearBorders(sources, empty, TRACED)

      expect(sources.derivedBorders).toEqual({ between: [], frontier: [] })
      expect(sources.borderPatterns?.size).toBe(0)
    })
  })
})
