import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import {
  authoredRegionColours,
  polityColours,
} from '@europe-historical-atlas/core/editor/polityColours'
import {
  openYearDocument,
  saveYearDocument,
} from '@europe-historical-atlas/core/editor/yearDocument'
import { hexToRgb } from '@europe-historical-atlas/core/utils/color'

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

/** What the compute settled: the traced lines, and no tint — the tests that need tints build their own. */
const COMPUTED = { borders: TRACED, tints: [] }

const PALETTE: [string, ...string[]] = ['#aa0000', '#00aa00', '#0000aa']

const RED = { r: 200, g: 0, b: 0 }
const BLUE = { r: 0, g: 0, b: 200 }

/**
 * Fail a test whose fixture is missing what it was built with.
 * @returns never
 */
function fail(): never {
  throw new Error('fixture: no authored year')
}

const PAYLOAD_YEAR: RegionSet = { year: 1500, regions: [] }

/**
 * The authored year with the Empire made a tribe, and its two regions named.
 * @returns the year
 */
function withTribe(): RegionSet {
  const year = authoredYear()
  const hre = year.authored?.year.registry.polities.find((polity) => polity.id === 'hre')
  if (hre) hre.rank = 'tribe'
  year.regions = [{ polityId: 'fr-couronne' }, { polityId: 'hre' }] as RegionSet['regions']
  return year
}

function authoredYear(): RegionSet {
  const doc = sharedBorderDocument()
  return {
    year: 1100,
    regions: [],
    authored: { year: { year: 1100, ...saveYearDocument(doc) }, bbox },
  }
}

/**
 * The authored year with the Empire made France's vassal, and its two regions named.
 * @returns the year
 */
function withVassal(): RegionSet {
  const year = authoredYear()
  const hre = year.authored?.year.registry.polities.find((polity) => polity.id === 'hre')
  if (hre) hre.suzerain = 'fr-couronne'
  year.regions = [{ polityId: 'fr-couronne' }, { polityId: 'hre' }] as RegionSet['regions']
  return year
}

describe('settleYearBorders', () => {
  describe('happy path', () => {
    it('draws an authored year’s borders from its anchors, each filed with its pattern', () => {
      const sources = createMapSources()

      settleYearBorders(sources, authoredYear(), COMPUTED, PALETTE)

      expect(sources.derivedBorders).not.toBe(TRACED)
      expect(sources.derivedBorders?.between).toHaveLength(1)
      expect(sources.borderPatterns?.get('0:0')).toBe('solid')
    })
  })

  describe('tribes', () => {
    it('leaves a tribe unfilled, its borders out, and its outline in its colour', () => {
      const sources = createMapSources()

      settleYearBorders(sources, withTribe(), { borders: TRACED, tints: [RED, BLUE] }, PALETTE)

      expect(sources.regionTints).toEqual([RED, null])
      expect(sources.derivedBorders?.between).toEqual([])
      expect(sources.tribeOutlines).toHaveLength(1)
      expect(sources.tribeOutlines[0]?.colour).toMatch(/^#[0-9a-f]{6}$/i)
      expect(sources.tribeOutlines[0]?.rings[0]?.length).toBeGreaterThan(3)
    })

    it('fills every region and outlines nothing in a year without a tribe', () => {
      const sources = createMapSources()
      const year = authoredYear()
      year.regions = [{ polityId: 'fr-couronne' }, { polityId: 'hre' }] as RegionSet['regions']

      settleYearBorders(sources, year, { borders: TRACED, tints: [RED, BLUE] }, PALETTE)

      expect(sources.regionTints).toEqual([RED, BLUE])
      expect(sources.tribeOutlines).toEqual([])
    })

    it('forgets the tribe outlines when a payload year follows', () => {
      const sources = createMapSources()
      settleYearBorders(sources, withTribe(), { borders: TRACED, tints: [RED, BLUE] }, PALETTE)

      settleYearBorders(sources, PAYLOAD_YEAR, { borders: TRACED, tints: [BLUE] }, PALETTE)

      expect(sources.tribeOutlines).toEqual([])
      expect(sources.regionTints).toEqual([BLUE])
    })
  })

  describe('levels of homage', () => {
    it('paints a vassal in its suzerain’s colour at level 0 and its own at the deepest', () => {
      const sources = createMapSources()
      const year = withVassal()
      const france = polityColours(openYearDocument(year.authored?.year ?? fail()), PALETTE).get(
        'fr-couronne'
      )

      settleYearBorders(sources, year, { borders: TRACED, tints: [RED, BLUE] }, PALETTE)

      const lord = hexToRgb(france ?? '')
      expect(sources.homageDepth).toBe(1)
      expect(sources.tintLevels).toEqual([
        [lord, lord],
        [RED, BLUE],
      ])
      expect(sources.borderLevels?.get('0:0')).toBe(1)
    })

    // The pipeline asks the compute for `authoredRegionColours`; the levels below are read from the
    // colours settleYearBorders derives itself. Same year, same palette: the deepest is the vassal's own.
    it('ends on the colours the pipeline asked the compute for, the vassal in its own', () => {
      const sources = createMapSources()
      const year = withVassal()
      const authored = year.authored?.year ?? fail()
      const asked = authoredRegionColours(authored, year.regions, PALETTE)

      settleYearBorders(sources, year, { borders: TRACED, tints: asked }, PALETTE)

      expect(sources.tintLevels).toHaveLength(2)
      expect(sources.tintLevels?.[1]).toEqual(asked)
      expect(sources.tintLevels?.[0]).toEqual([asked[0], asked[0]])
    })

    it('files the border between two sovereigns at level 0, in one level of tints', () => {
      const sources = createMapSources()
      const year = authoredYear()
      year.regions = [{ polityId: 'fr-couronne' }, { polityId: 'hre' }] as RegionSet['regions']

      settleYearBorders(sources, year, { borders: TRACED, tints: [RED, BLUE] }, PALETTE)

      expect(sources.homageDepth).toBe(0)
      expect(sources.tintLevels).toEqual([[RED, BLUE]])
      expect(sources.borderLevels?.get('0:0')).toBe(0)
    })

    it('keeps a tribe unfilled at every level', () => {
      const sources = createMapSources()
      const year = withVassal()
      const hre = year.authored?.year.registry.polities.find((polity) => polity.id === 'hre')
      if (hre) hre.rank = 'tribe'

      settleYearBorders(sources, year, { borders: TRACED, tints: [RED, BLUE] }, PALETTE)

      expect(sources.tintLevels?.map((level) => level[1])).toEqual([null, null])
    })

    it('gives a payload year one level and no border level, forgetting the authored year’s', () => {
      const sources = createMapSources()
      settleYearBorders(sources, withVassal(), { borders: TRACED, tints: [RED, BLUE] }, PALETTE)

      settleYearBorders(sources, PAYLOAD_YEAR, { borders: TRACED, tints: [BLUE] }, PALETTE)

      expect(sources.tintLevels).toEqual([[BLUE]])
      expect(sources.homageDepth).toBe(0)
      expect(sources.borderLevels).toBeNull()
    })
  })

  describe('variants', () => {
    it('keeps the raster’s lines for a year read from the payloads, with no pattern of its own', () => {
      const sources = createMapSources()

      settleYearBorders(sources, PAYLOAD_YEAR, COMPUTED, PALETTE)

      expect(sources.derivedBorders).toBe(TRACED)
      expect(sources.borderPatterns).toBeNull()
    })

    it('forgets the previous authored year’s patterns when a payload year follows it', () => {
      const sources = createMapSources()
      settleYearBorders(sources, authoredYear(), COMPUTED, PALETTE)

      settleYearBorders(sources, PAYLOAD_YEAR, COMPUTED, PALETTE)

      expect(sources.borderPatterns).toBeNull()
    })
  })

  describe('managed errors', () => {
    // The mask failed: no frontier against unclaimed ground, as the raster derivation does.
    it('draws the shared limit and no frontier without a land mask', () => {
      const sources = createMapSources()

      settleYearBorders(sources, authoredYear(), COMPUTED, PALETTE)

      expect(sources.derivedBorders?.frontier).toEqual([])
    })
  })

  // L4: N/A — nothing is awaited or caught; a malformed year was refused when it was read.

  describe('edge cases', () => {
    it('settles an authored year with no claim to no line at all', () => {
      const sources = createMapSources()
      const empty = authoredYear()
      if (empty.authored) empty.authored.year.polities.claims = []

      settleYearBorders(sources, empty, COMPUTED, PALETTE)

      expect(sources.derivedBorders).toEqual({ between: [], frontier: [] })
      expect(sources.borderPatterns?.size).toBe(0)
    })
  })
})
