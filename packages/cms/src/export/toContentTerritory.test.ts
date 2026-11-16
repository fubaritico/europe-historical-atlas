import { describe, expect, it } from 'vitest'

import { territoryNumberOf, toContentTerritories } from './toContentTerritory'

describe('toContentTerritories', () => {
  describe('happy path', () => {
    it('gives each territory its number, its French name and its Wikidata id', () => {
      expect(
        toContentTerritories([
          { id: 12, name: 'Duché de Bretagne', wikidata: 'Q327555' },
          { id: 42, name: 'Thuringe', wikidata: null },
        ])
      ).toEqual([
        { id: 12, name: 'Duché de Bretagne', wikidata: 'Q327555' },
        { id: 42, name: 'Thuringe', wikidata: null },
      ])
    })
  })

  describe('variants', () => {
    it('reads a Wikidata id left out as none', () => {
      expect(toContentTerritories([{ id: 42, name: 'Thuringe' }])).toEqual([
        { id: 42, name: 'Thuringe', wikidata: null },
      ])
    })
  })

  describe('managed errors', () => {
    it('refuses a territory with no French name, naming it', () => {
      expect(() => toContentTerritories([{ id: 42, name: '' }])).toThrow(
        'territory 42: no French name'
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
