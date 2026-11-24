import { describe, expect, it } from 'vitest'

import { attachDecision, titleYears } from './attachDecision'

import type { CitySheetRead, TitleRead } from './attachDecision'

/** Raymond IV, count of Toulouse, whose territory has a Wikidata id. */
const RAYMOND: TitleRead = { id: 7, territoryName: 'comté de Toulouse', territoryQid: 'Q1334322' }

/**
 * A sheet of the city.
 * @param id - its id
 * @param from - its first year
 * @param to - its last year, for a span
 * @param rest - what else it holds
 * @returns the sheet
 */
function sheet(
  id: number,
  from: number,
  to: number | null = null,
  rest: Partial<CitySheetRead> = {}
): CitySheetRead {
  return {
    id,
    date: { start: { year: from }, end: to === null ? null : { year: to } },
    holderTitle: null,
    testimonies: [],
    ...rest,
  }
}

describe('attachDecision', () => {
  describe('happy path', () => {
    it('makes a sheet for a city with none at the year', () => {
      expect(attachDecision([], RAYMOND, 1100)).toEqual({ kind: 'create' })
    })

    it('attaches the title to the one sheet that covers the year, held by nobody', () => {
      expect(attachDecision([sheet(3, 1100)], RAYMOND, 1100)).toEqual({ kind: 'attach', sheet: 3 })
    })
  })

  describe('variants', () => {
    it('makes a sheet when the city’s sheets are of other years', () => {
      expect(attachDecision([sheet(3, 1200), sheet(4, 1050, 1080)], RAYMOND, 1100)).toEqual({
        kind: 'create',
      })
    })

    it('finds a sheet whose span covers the year', () => {
      expect(attachDecision([sheet(3, 1094, 1105)], RAYMOND, 1100)).toEqual({
        kind: 'attach',
        sheet: 3,
      })
    })

    it('changes nothing for a city already held by the title', () => {
      expect(attachDecision([sheet(3, 1100, null, { holderTitle: 7 })], RAYMOND, 1100)).toEqual({
        kind: 'unchanged',
        sheet: 3,
      })
    })

    it('attaches over a line naming the title’s own territory, by its Wikidata id or by its name', () => {
      const byId = { subject: 'holder', holderName: 'County of Toulouse', holderQid: 'Q1334322' }
      const byName = { subject: 'holder', holderName: 'Comté de Toulouse', holderQid: null }
      const lines = { testimonies: [byId, byName] }
      expect(attachDecision([sheet(3, 1100, null, lines)], RAYMOND, 1100).kind).toBe('attach')
    })
  })

  describe('managed errors', () => {
    it('leaves a city held by another title, naming it', () => {
      expect(attachDecision([sheet(3, 1100, null, { holderTitle: 9 })], RAYMOND, 1100)).toEqual({
        kind: 'conflict',
        sheet: 3,
        reason: { kind: 'otherTitle', title: 9 },
      })
    })

    it('leaves a city a line gives to another polity — a bishop — naming it', () => {
      const bishop = { subject: 'holder', holderName: 'évêché de Nîmes', holderQid: 'Q1' }
      expect(
        attachDecision([sheet(3, 1100, null, { testimonies: [bishop] })], RAYMOND, 1100)
      ).toEqual({
        kind: 'conflict',
        sheet: 3,
        reason: { kind: 'otherLine', holder: 'évêché de Nîmes' },
      })
    })

    it('leaves a city two sheets of which cover the year', () => {
      expect(attachDecision([sheet(3, 1100), sheet(4, 1090, 1110)], RAYMOND, 1100)).toEqual({
        kind: 'conflict',
        sheet: null,
        reason: { kind: 'severalSheets', count: 2 },
      })
    })
  })

  describe('unmanaged errors', () => {
    it('throws on a sheet whose date cannot be read', () => {
      const broken = { ...sheet(3, 1100), date: { start: null, end: null } }
      expect(() => attachDecision([broken], RAYMOND, 1100)).toThrow('unreadable date')
    })
  })

  describe('edge cases', () => {
    it('reads a line that is not about the holder as naming nobody', () => {
      const population = { subject: 'population', holderName: 'évêché de Nîmes', holderQid: null }
      expect(
        attachDecision([sheet(3, 1100, null, { testimonies: [population] })], RAYMOND, 1100).kind
      ).toBe('attach')
    })

    it('gives a title with no end its start year alone, and a span its two ends', () => {
      expect(titleYears({ start: { year: 1100 } })).toEqual({ from: 1100, to: 1100 })
      expect(titleYears({ start: { year: 1094 }, end: { year: 1105 } })).toEqual({
        from: 1094,
        to: 1105,
      })
      expect(titleYears({ start: null })).toBeNull()
    })
  })
})
