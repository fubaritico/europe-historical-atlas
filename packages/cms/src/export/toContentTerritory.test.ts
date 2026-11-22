import { describe, expect, it } from 'vitest'

import { territoryNumberOf, toContentTerritories } from './toContentTerritory'

describe('toContentTerritories', () => {
  describe('happy path', () => {
    it('gives each territory its number, its French name and its Wikidata id', () => {
      expect(
        toContentTerritories([
          { id: 12, name: 'Duché de Bretagne', wikidata: 'Q327555', kind: 'duchy' },
          { id: 42, name: 'Thuringe', wikidata: null, kind: 'county' },
        ])
      ).toEqual([
        {
          id: 12,
          name: 'Duché de Bretagne',
          wikidata: 'Q327555',
          kind: 'duchy',
          existsFrom: null,
          existsTo: null,
          names: [],
        },
        {
          id: 42,
          name: 'Thuringe',
          wikidata: null,
          kind: 'county',
          existsFrom: null,
          existsTo: null,
          names: [],
        },
      ])
    })

    it('gives its kind and the years it exists between, for the polity’s form to propose (CARTO-488)', () => {
      const jable = {
        id: 372,
        name: 'Jablé',
        kind: 'emirate',
        existsFrom: { year: 1081, month: null },
        existsTo: { year: null },
      }
      expect(toContentTerritories([jable])).toEqual([
        {
          id: 372,
          name: 'Jablé',
          wikidata: null,
          kind: 'emirate',
          existsFrom: 1081,
          existsTo: null,
          names: [],
        },
      ])
    })
  })

  describe('variants', () => {
    // CMS-495: one name a language, beside the French one.
    it('gives a territory its names in the other languages, a row not yet filled left out', () => {
      const champagne = {
        id: 130,
        name: 'comté de Champagne',
        kind: 'county',
        otherNames: [
          { id: 'a', language: 'en', form: ' County of Champagne ' },
          { id: 'b', language: 'de', form: '' },
        ],
      }
      expect(toContentTerritories([champagne])[0]?.names).toEqual([
        { language: 'en', form: 'County of Champagne' },
      ])
    })

    it('reads a Wikidata id left out as none', () => {
      expect(toContentTerritories([{ id: 42, name: 'Thuringe', kind: 'county' }])).toEqual([
        {
          id: 42,
          name: 'Thuringe',
          wikidata: null,
          kind: 'county',
          existsFrom: null,
          existsTo: null,
          names: [],
        },
      ])
    })
  })

  describe('managed errors', () => {
    it('refuses a territory with no French name, naming it', () => {
      expect(() => toContentTerritories([{ id: 42, name: '', kind: 'county' }])).toThrow(
        'territory 42: no French name'
      )
    })

    it('refuses a year that is no whole number, naming the territory, rather than exporting « no year »', () => {
      const bad = { id: 42, name: 'Thuringe', kind: 'county', existsFrom: { year: 1081.5 } }
      expect(() => toContentTerritories([bad])).toThrow(
        'territory 42, exists from: its year is not a whole number (1081.5)'
      )
    })

    it('refuses a territory with no kind, naming it', () => {
      expect(() => toContentTerritories([{ id: 42, name: 'Thuringe' }])).toThrow(
        'territory 42: no kind'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('refuses an id that is not a number', () => {
      expect(() => territoryNumberOf('abc', 'territory abc')).toThrow('is not a number')
    })
  })

  describe('edge cases', () => {
    it('gives nothing for no territory', () => {
      expect(toContentTerritories([])).toEqual([])
    })

    it.each([0, -1, 1.5])('refuses %d as a territory number', (id) => {
      expect(() => territoryNumberOf(id, 'here')).toThrow('is not a number')
    })
  })
})
