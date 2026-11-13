import { describe, expect, it, vi } from 'vitest'

import { authoredRegionColours } from '../data/polityColours'
import { projectRegions } from '../data/regionSource'
import { franceAndAquitaine } from '../data/testing/authoredYearFixture'
import { TWO_OVERLAPPING, squaresDocument } from '../data/testing/overlapFixtures'
import { toRegionPayload } from '../data/toRegionPayload'
import { saveYearDocument } from '../data/yearDocument'

import { BAKED_OVERLAPS_VERSION, overlapsKey } from './bakedOverlaps'
import { settleAuthoredYear } from './settleYear'

import type { BakedOverlaps } from './bakedOverlaps'
import type { SettleRequest } from './settleYear'
import type { AuthoredYear } from '../data/yearFormat'

const BBOX = { west: -10, south: 35, east: 10, north: 60 }
const PALETTE: [string, ...string[]] = ['#aa0000', '#00aa00', '#0000aa']

/**
 * The request for a year, its regions read as the atlas reads them.
 * @param year - the year
 * @returns the request
 */
function requestFor(year: AuthoredYear): SettleRequest {
  const regions = projectRegions(toRegionPayload(year, BBOX)).regions
  return { year, bbox: BBOX, regions, palette: PALETTE }
}

/**
 * France and Aquitaine, Aquitaine made a tribe.
 * @returns the year
 */
function withTribe(): AuthoredYear {
  const year = franceAndAquitaine()
  const aquitaine = year.registry.polities.find((polity) => polity.id === 'aquitaine')
  if (aquitaine) {
    aquitaine.rank = 'tribe'
    aquitaine.suzerain = null
  }
  return year
}

// ATLAS-333: the settling moved from the atlas's loading/yearBorders to core, so the worker can run it. The atlas's
// suite (yearBorders.test.ts) still walks its cases through settleYearBorders; this one holds what the worker returns.
describe('settleAuthoredYear', () => {
  describe('happy path', () => {
    it('ends on each region’s own colour, the vassal in its suzerain’s from afar', () => {
      const request = requestFor(franceAndAquitaine())
      const settled = settleAuthoredYear(request, null)
      const own = authoredRegionColours(request.year, request.regions, PALETTE)
      const france = request.regions.findIndex((region) => region.polityId === 'fr-couronne')
      expect(settled.homageDepth).toBe(1)
      expect(settled.tints).toEqual(own)
      expect(settled.tintLevels).toEqual([own.map(() => own[france]), own])
    })

    // ATLAS-398: the vassal's region carries its depth, for the band's reveal; the sovereign's none.
    it('gives the vassal’s region its depth of homage for the band, the sovereign’s nought', () => {
      const request = requestFor(franceAndAquitaine())
      const settled = settleAuthoredYear(request, null)
      expect(settled.bandDepths).toEqual(
        request.regions.map((region) => (region.polityId === 'aquitaine' ? 1 : 0))
      )
    })

    // ATLAS-398: a vassal that is a tribe keeps the tribe's look — no vassals' band. Mutation: `isBandedVassal`
    // reading the suzerain alone gives Aquitaine a depth here.
    it('gives a vassal that is a tribe no band', () => {
      const year = franceAndAquitaine()
      const aquitaine = year.registry.polities.find((polity) => polity.id === 'aquitaine')
      if (aquitaine) aquitaine.rank = 'tribe'
      const settled = settleAuthoredYear(requestFor(year), null)
      expect(settled.bandDepths.every((depth) => depth === 0)).toBe(true)
    })

    it('draws the borders from the anchors, each group with its pattern and level', () => {
      const settled = settleAuthoredYear(requestFor(franceAndAquitaine()), null)
      expect(settled.borders.between.length).toBeGreaterThan(0)
      for (const group of settled.borders.between) {
        const key = `${String(group.pair[0])}:${String(group.pair[1])}`
        expect([settled.patterns.has(key), settled.levels.has(key)]).toEqual([true, true])
      }
    })
  })

  describe('variants', () => {
    it('leaves a tribe unfilled at every level, its ground apart in its colour', () => {
      const request = requestFor(withTribe())
      const settled = settleAuthoredYear(request, null)
      const tribe = request.regions.findIndex((region) => region.polityId === 'aquitaine')
      expect(settled.tintLevels.map((level) => level[tribe])).toEqual(
        settled.tintLevels.map(() => null)
      )
      expect(settled.tribes.map(({ polity }) => polity)).toEqual(['aquitaine'])
      expect(settled.tribes[0]?.colour).toMatch(/^#[0-9a-f]{6}$/i)
    })

    // CARTO-439: the outlined tribe is marked for the atlas's shader; a plain tribe carries no mark.
    it('marks an outlined tribe for the atlas, and leaves a plain tribe unmarked', () => {
      const outlined = withTribe()
      const aquitaine = outlined.registry.polities.find((polity) => polity.id === 'aquitaine')
      if (aquitaine) aquitaine.rank = 'tribe_outlined'
      expect([
        settleAuthoredYear(requestFor(outlined), null).tribes[0]?.outlined,
        'outlined' in (settleAuthoredYear(requestFor(withTribe()), null).tribes[0] ?? {}),
      ]).toEqual([true, false])
    })

    it('has no tribe in a year without one', () => {
      expect(settleAuthoredYear(requestFor(franceAndAquitaine()), null).tribes).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('says a border it cannot draw yet where it is told, never on its own', () => {
      const warn = vi.fn()
      settleAuthoredYear(requestFor(franceAndAquitaine()), null, warn)
      // Nothing undrawable in this year: the report goes nowhere else either.
      expect(warn).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('settles a year with no claim to no line and no tint', () => {
      const year = franceAndAquitaine()
      year.polities.claims = []
      const settled = settleAuthoredYear({ ...requestFor(year), regions: [] }, null)
      expect([settled.borders, settled.tints, settled.tribes]).toEqual([
        { between: [], frontier: [] },
        [],
        [],
      ])
    })
  })

  // ATLAS-399: the overlaps, in their polities' colours, for the hatching.
  describe('overlaps', () => {
    it('hands test1 and test2’s shared band to hatch, in their colours, nothing refused', () => {
      const year = { year: 1100, ...saveYearDocument(squaresDocument(TWO_OVERLAPPING)) }
      const settled = settleAuthoredYear(requestFor(year), null)
      expect([
        settled.hatches.map(({ polities }) => polities),
        settled.hatches[0]?.colours[0],
        settled.hatchRefusals,
      ]).toEqual([[['test1', 'test2']], { r: 0xff, g: 0x20, b: 0x00 }, []])
    })

    it('takes the build’s overlaps under the year’s own key, rather than computing them', () => {
      const year = { year: 1100, ...saveYearDocument(squaresDocument(TWO_OVERLAPPING)) }
      const given = { pieces: [], refused: [{ a: 'test1', b: 'test2', reason: 'from the build' }] }
      const baked: BakedOverlaps = {
        version: BAKED_OVERLAPS_VERSION,
        key: overlapsKey(year),
        overlaps: given,
      }
      const settled = settleAuthoredYear({ ...requestFor(year), baked }, null)
      expect([settled.hatches, settled.hatchRefusals, settled.overlapsFrom]).toEqual([
        [],
        given.refused,
        'build',
      ])
    })

    it('computes them again when the build’s file is for another version of the year', () => {
      const year = { year: 1100, ...saveYearDocument(squaresDocument(TWO_OVERLAPPING)) }
      const baked: BakedOverlaps = {
        version: BAKED_OVERLAPS_VERSION,
        key: 'another',
        overlaps: { pieces: [], refused: [] },
      }
      const settled = settleAuthoredYear({ ...requestFor(year), baked }, null)
      expect([settled.hatches.length, settled.overlapsFrom]).toEqual([1, 'computed'])
    })

    it('hatches nothing between a vassal and its suzerain', () => {
      expect(settleAuthoredYear(requestFor(franceAndAquitaine()), null).hatches).toEqual([])
    })
  })

  // L4: N/A — nothing is awaited or caught; a malformed year was refused when it was read.
})
