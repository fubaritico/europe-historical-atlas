import { describe, expect, it } from 'vitest'

import { readTerritoryRequest, territoryBody } from './territoryRequest'

import type { TerritoryRequest } from './territoryRequest'

/** A request the page would send for the County of Flanders. */
const FLANDERS: TerritoryRequest = {
  name: 'Comté de Flandre',
  nameEn: 'County of Flanders',
  kind: 'county',
  wikidata: 'Q234598',
  existsFrom: 862,
  existsTo: 1795,
}

/**
 * The request as text, some fields replaced.
 * @param fields - what to replace
 * @returns the body
 */
function body(fields: Record<string, unknown> = {}): string {
  return JSON.stringify({ ...FLANDERS, ...fields })
}

describe('readTerritoryRequest', () => {
  describe('happy path', () => {
    it('reads a whole request', () => {
      expect(readTerritoryRequest(body())).toEqual(FLANDERS)
    })
  })

  describe('variants', () => {
    it('trims the names and the item', () => {
      expect(
        readTerritoryRequest(body({ name: '  Comté de Flandre ', wikidata: ' Q234598' }))
      ).toEqual(FLANDERS)
    })

    it('takes no years as nothing known', () => {
      expect(readTerritoryRequest(body({ existsFrom: null, existsTo: undefined }))).toEqual({
        ...FLANDERS,
        existsFrom: null,
        existsTo: null,
      })
    })
  })

  describe('managed errors', () => {
    it.each([
      [{ name: ' ' }, 'the French name is missing'],
      [{ nameEn: null }, 'the English name is missing'],
      [{ kind: 'abbey' }, 'the rank is not one of the ranks'],
      [{ wikidata: 'P31' }, 'the Wikidata item is missing or malformed'],
      [{ existsFrom: 862.5 }, 'a year is not a whole year'],
      [{ existsTo: 0 }, 'a year is not a whole year'],
      [{ existsTo: 800 }, 'the end comes before the beginning'],
    ])('refuses %o: %s', (fields, reason) => {
      expect(readTerritoryRequest(body(fields))).toEqual({ refused: reason })
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a body that is not JSON', () => {
      expect(readTerritoryRequest('{')).toEqual({ refused: 'the request is not JSON' })
    })
  })

  describe('edge cases', () => {
    it('refuses JSON that is not an object', () => {
      expect(readTerritoryRequest('null')).toEqual({ refused: 'the request is not an object' })
    })

    it('takes a polity that lasted a single year', () => {
      expect(readTerritoryRequest(body({ existsFrom: 1100, existsTo: 1100 }))).not.toHaveProperty(
        'refused'
      )
    })
  })
})

describe('territoryBody', () => {
  describe('happy path', () => {
    it('writes the English name as another name, and the years as their year', () => {
      expect(territoryBody(FLANDERS)).toEqual({
        name: 'Comté de Flandre',
        kind: 'county',
        otherNames: [{ language: 'en', form: 'County of Flanders' }],
        wikidata: 'Q234598',
        existsFrom: { year: 862 },
        existsTo: { year: 1795 },
      })
    })
  })

  describe('edge cases', () => {
    it('leaves out a year nothing says', () => {
      const territory = territoryBody({ ...FLANDERS, existsFrom: null, existsTo: null })
      expect(territory).not.toHaveProperty('existsFrom')
      expect(territory).not.toHaveProperty('existsTo')
    })
  })
})
