import { describe, expect, it } from 'vitest'

import { LEADER_DOT } from '@europe-historical-atlas/core/pipeline/nameOffset'
import { NAME_GRID_WIDTH } from '@europe-historical-atlas/core/pipeline/yearNames'

import { DEFAULT_NAME_PARAMS } from '../tunables/params'

import { charactersToMeasure, writtenNames, yearNamesRequest } from './namesRequest'
import { AUTHORED_YEAR, META } from './testing/yearFixtures'

const ENGLAND = { id: 'en', name: 'Kingdom of England', shortName: 'England' }

// ATLAS-333: the one request the page and the build place a year's names from.
describe('writtenNames', () => {
  describe('happy path', () => {
    it('writes England short and full, as entered', () => {
      expect(writtenNames([ENGLAND], DEFAULT_NAME_PARAMS)).toEqual({
        short: { en: 'England' },
        full: { en: 'Kingdom of England' },
      })
    })
  })

  describe('variants', () => {
    it('writes them in capitals when the panel says so', () => {
      expect(writtenNames([ENGLAND], { ...DEFAULT_NAME_PARAMS, capitals: true }).short.en).toBe(
        'ENGLAND'
      )
    })
  })

  describe('edge cases', () => {
    it('gives no full name to a polity whose short name is forced', () => {
      expect(
        writtenNames([{ ...ENGLAND, forceShortName: true }], DEFAULT_NAME_PARAMS).full
      ).toEqual({})
    })
  })

  // L3, L4: N/A — names in, names out.
})

describe('charactersToMeasure', () => {
  describe('happy path', () => {
    it('lists every letter of England’s two names once, and the leader’s dot', () => {
      const names = writtenNames([ENGLAND], DEFAULT_NAME_PARAMS)
      const characters = charactersToMeasure(names)
      expect(new Set(characters).size).toBe(characters.length)
      expect(characters).toEqual(expect.arrayContaining(['K', 'E', 'f', LEADER_DOT]))
    })
  })

  describe('edge cases', () => {
    it('keeps an astral letter whole, as one character', () => {
      expect(charactersToMeasure({ short: { x: '𝔄' }, full: {} })).toContain('𝔄')
    })

    it('still asks for the leader’s dot when the year names nobody', () => {
      expect(charactersToMeasure({ short: {}, full: {} })).toEqual([LEADER_DOT])
    })
  })

  // L2, L3, L4: N/A — names in, characters out.
})

describe('yearNamesRequest', () => {
  const authored = AUTHORED_YEAR.authored
  if (authored === undefined) throw new Error('fixture: not an authored year')
  const request = yearNamesRequest({
    loaded: { ...AUTHORED_YEAR, authored },
    names: writtenNames(authored.year.registry.polities, DEFAULT_NAME_PARAMS),
    glyphs: {},
    meta: { width: 1920, height: 1745 },
    params: DEFAULT_NAME_PARAMS,
  })

  describe('happy path', () => {
    it('asks for the year’s regions, one bearer list per display level', () => {
      expect(request.regions).toBe(AUTHORED_YEAR.regions)
      expect(request.bearersByLevel[0]).toHaveLength(AUTHORED_YEAR.regions.length)
    })
  })

  describe('variants', () => {
    it('keeps the relief’s proportions on the names’ grid: 1920 × 1745 gives 1091 rows', () => {
      expect([request.gridWidth, request.gridHeight]).toEqual([NAME_GRID_WIDTH, 1091])
    })
  })

  describe('managed errors', () => {
    it('refuses a region with no polity, which an authored year never has', () => {
      const [first] = AUTHORED_YEAR.regions
      if (first === undefined) throw new Error('fixture: no region')
      const bare: { polityId?: string } & Omit<typeof first, 'polityId'> = { ...first }
      delete bare.polityId
      expect(() =>
        yearNamesRequest({
          loaded: { ...AUTHORED_YEAR, regions: [bare], authored },
          names: { short: {}, full: {} },
          glyphs: {},
          meta: META,
          params: DEFAULT_NAME_PARAMS,
        })
      ).toThrow('an authored region carries no polity id')
    })
  })

  // L4, L5: N/A — the placement's own suites hold its edges.
})
