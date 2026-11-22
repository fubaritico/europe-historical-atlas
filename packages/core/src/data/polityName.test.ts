import { describe, expect, it } from 'vitest'

import { namesToFill, polityNaming, territoryNameIn, territoryOf } from './polityName'

import type { ContentTerritory } from './contentFormat'
import type { NamedPolity } from './polityName'

const CHAMPAGNE: ContentTerritory = {
  id: 130,
  name: 'comté de Champagne',
  wikidata: 'Q546266',
  names: [{ language: 'en', form: 'County of Champagne' }],
}
const THURINGIA: ContentTerritory = { id: 367, name: 'Thuringe', wikidata: null, names: [] }
const TERRITORIES = [CHAMPAGNE, THURINGIA]

const champagne: NamedPolity = {
  id: 'county-of-champagne',
  name: 'County of Champagne',
  wikidata: 'Q546266',
}
const thuringia: NamedPolity = {
  id: 'thuringia',
  name: 'Thuringia',
  wikidata: null,
  territory: 367,
}
const friesland: NamedPolity = { id: 'friesland', name: 'Friesland', wikidata: null }

describe('polityName', () => {
  describe('happy path', () => {
    it('names a country by its territory, in the reader’s language', () => {
      expect(polityNaming(champagne, TERRITORIES, 'fr')).toEqual({
        name: 'comté de Champagne',
        origin: 'territory',
      })
      expect(polityNaming(champagne, TERRITORIES, 'en')).toEqual({
        name: 'County of Champagne',
        origin: 'territory',
      })
    })

    it('finds nothing to fill on a map wholly named', () => {
      expect(namesToFill([champagne, thuringia], TERRITORIES, 'fr')).toEqual([])
    })
  })

  describe('variants', () => {
    it('ties a country with no Wikidata id to its territory by the CMS’s number', () => {
      expect(territoryOf(thuringia, TERRITORIES)).toBe(THURINGIA)
      expect(polityNaming(thuringia, TERRITORIES, 'fr').name).toBe('Thuringe')
    })

    it('writes the French name of a territory nobody named in the reader’s language, and says so', () => {
      expect(polityNaming(thuringia, TERRITORIES, 'en')).toEqual({
        name: 'Thuringe',
        origin: 'territory-french',
      })
    })

    it('writes the map’s own name for a country tied to no territory, and says so', () => {
      expect(polityNaming(friesland, TERRITORIES, 'fr')).toEqual({
        name: 'Friesland',
        origin: 'map',
      })
    })

    it('lists what is still to translate or to tie, in the map’s order', () => {
      expect(namesToFill([champagne, thuringia, friesland], TERRITORIES, 'en')).toEqual([
        { id: 'thuringia', written: 'Thuringe', origin: 'territory-french' },
        { id: 'friesland', written: 'Friesland', origin: 'map' },
      ])
    })
  })

  // L3–L4: N/A — pure readings of a checked year and a checked export; what is missing is an answer, named above.
  describe('edge cases', () => {
    it('never ties two countries with different Wikidata ids, whatever their numbers', () => {
      const other: NamedPolity = { id: 'x', name: 'X', wikidata: 'Q1', territory: 130 }
      expect(territoryOf(other, TERRITORIES)).toBeNull()
    })

    it('reads no name in another language from a territory of an export written before them', () => {
      expect(territoryNameIn({ name: 'Thuringe' }, 'en')).toBeNull()
      expect(territoryNameIn({ name: 'Thuringe' }, 'fr')).toBe('Thuringe')
    })

    it('finds no territory in an export that holds none', () => {
      expect(territoryOf(champagne, [])).toBeNull()
      expect(namesToFill([champagne], [], 'fr')).toEqual([
        { id: 'county-of-champagne', written: 'County of Champagne', origin: 'map' },
      ])
    })
  })
})
