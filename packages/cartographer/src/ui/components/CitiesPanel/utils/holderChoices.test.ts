import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { holderChoices } from './holderChoices'

import type { CityHolder, CityMark } from '../../../../state/citiesSlice'
import type { PolityRow } from '../../../utils/polityRows'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

const EMPIRE: CityHolder = { name: 'Sacrum Imperium', wikidata: 'Q12548' }
const VENICE: CityHolder = { name: 'Repubblica di Venezia', wikidata: 'Q4948' }
const ARAGON: CityHolder = { name: 'Aragon', wikidata: 'Q199442' }
const ISLES: CityHolder = { name: 'Kingdom of the Isles', wikidata: null }
const EPIRUS: CityHolder = { name: 'Épire', wikidata: 'Q1132539' }

/**
 * A city of 1100 and its holder.
 * @param id - its id and name
 * @param holder - its holder by the sources, or `null`
 * @returns the city
 */
function city(id: string, holder: CityHolder | null): CityMark {
  return {
    id,
    name: id,
    lon: 0,
    lat: 0,
    date: {
      kind: 'instant',
      at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
    },
    holder,
    holderSources: [],
  }
}

/**
 * The two-polity fixture: the Empire (`hre`) with its Wikidata id, France with the one given.
 * @param france - France's Wikidata id
 * @returns the document
 */
function map(france: string | null): YearDocument {
  const document = sharedBorderDocument()
  for (const polity of document.polities)
    polity.wikidata = polity.id === 'hre' ? EMPIRE.wikidata : france
  return document
}

/**
 * The document's polities as rows, in its own order, top level.
 * @param document - the map
 * @returns the rows
 */
function rows(document: YearDocument): PolityRow[] {
  return document.polities.map(({ id, name, wikidata }) => ({
    id,
    name,
    wikidata,
    rank: '',
    dates: '',
    colour: '#123456',
    hasTerritory: true,
    depth: 0,
    suzerainName: null,
  }))
}

// CARTO-370, `s20`: the map's polities, then the holders not on the map, then « Sans détenteur ».
describe('holderChoices', () => {
  describe('happy path', () => {
    it('counts the Empire two cities, France none, and lists Venice as not on the map', () => {
      const document = map('Q70972')
      const choices = holderChoices(rows(document), [
        city('metz', EMPIRE),
        city('trier', EMPIRE),
        city('treviso', VENICE),
      ])
      expect(choices.onMap.map(({ key, count }) => [key, count])).toEqual(
        rows(document).map(({ id }) => (id === 'hre' ? ['wd:Q12548', 2] : ['wd:Q70972', 0]))
      )
      expect(choices.offMap).toEqual([{ key: 'wd:Q4948', name: 'Repubblica di Venezia', count: 1 }])
    })
  })

  describe('variants', () => {
    it('counts the cities with no holder entered', () => {
      const document = map('Q70972')
      expect(
        holderChoices(rows(document), [city('paris', null), city('lyon', null)]).noHolder
      ).toBe(2)
    })

    it('lists a holder without a Wikidata id off the map, by its name', () => {
      const document = map('Q70972')
      expect(holderChoices(rows(document), [city('man', ISLES)]).offMap).toEqual([
        { key: 'name:Kingdom of the Isles', name: 'Kingdom of the Isles', count: 1 },
      ])
    })

    it('sorts the holders not on the map by name, accents and case ignored', () => {
      const document = map('Q70972')
      const names = holderChoices(rows(document), [
        city('treviso', VENICE),
        city('man', ISLES),
        city('jaca', ARAGON),
        city('ioannina', EPIRUS),
      ]).offMap.map(({ name }) => name)
      // « Épire » between Aragon and the Isles: by code points, « É » would come after « R ».
      expect(names).toEqual(['Aragon', 'Épire', 'Kingdom of the Isles', 'Repubblica di Venezia'])
    })

    it('stands for every key a box of the dialogue ticks: the map, off the map, and « none »', () => {
      const document = map('Q70972')
      expect([...holderChoices(rows(document), [city('treviso', VENICE)]).keys].sort()).toEqual([
        'none',
        'wd:Q12548',
        'wd:Q4948',
        'wd:Q70972',
      ])
    })
  })

  // L3: N/A — nothing is refused.

  describe('unmanaged errors', () => {
    it('gives France no key and no count when it has no Wikidata id: nothing to match the sources by', () => {
      const document = map(null)
      const france = holderChoices(rows(document), [city('paris', null)]).onMap.find(
        ({ id }) => id !== 'hre'
      )
      expect([france?.key, france?.count]).toEqual([null, 0])
    })
  })

  describe('edge cases', () => {
    it("carries a vassal's depth and a polity's missing colour into its choice, as {Polities} lists them", () => {
      const document = map('Q70972')
      const [first, second] = rows(document)
      if (first === undefined || second === undefined)
        throw new Error('the fixture has two polities')
      const choices = holderChoices([first, { ...second, depth: 1, colour: null }], [])
      expect(choices.onMap.map(({ depth, colour }) => [depth, colour])).toEqual([
        [0, '#123456'],
        [1, null],
      ])
    })

    it('keeps the holder the map carries off the second list, whatever name the sources give it', () => {
      const document = map('Q70972')
      const choices = holderChoices(rows(document), [
        city('metz', { name: 'Saint-Empire', wikidata: EMPIRE.wikidata }),
      ])
      expect([choices.offMap, choices.onMap.find(({ id }) => id === 'hre')?.count]).toEqual([[], 1])
    })

    it('offers the map polities and « none » with no city at all', () => {
      const document = map('Q70972')
      const choices = holderChoices(rows(document), [])
      expect([choices.onMap.length, choices.offMap, choices.noHolder]).toEqual([2, [], 0])
    })
  })
})
