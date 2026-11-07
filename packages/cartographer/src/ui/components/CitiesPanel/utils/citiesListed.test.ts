import { describe, expect, it } from 'vitest'

import { citiesListed } from './citiesListed'

import type { CityVerdict } from './cityVerdict'
import type { CityHolder, CityMark } from '../../../../state/citiesSlice'

const EMPIRE: CityHolder = { name: 'Sacrum Imperium', wikidata: 'Q12548' }

/**
 * A city of 1100 held by the Empire.
 * @param name - its id and name
 * @returns the city
 */
function city(name: string): CityMark {
  return {
    id: name,
    name,
    lon: 0,
    lat: 0,
    date: {
      kind: 'instant',
      at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
    },
    holder: EMPIRE,
    holderSources: [],
  }
}

const CITIES = [city('Trier'), city('Paris'), city('Aachen')]
const VERDICTS: ReadonlyMap<string, CityVerdict> = new Map()
const NONE = new Set<string>()

// CARTO-382: the filters first, then the order — the order applies to the cities found.
describe('citiesListed', () => {
  describe('happy path', () => {
    it('filters by name, then sorts what is found: « r » keeps Trier and Paris, by name', () => {
      expect(
        citiesListed(CITIES, 'r', { ticked: NONE, tickedStates: NONE, sort: 'name' }, VERDICTS).map(
          ({ name }) => name
        )
      ).toEqual(['Paris', 'Trier'])
    })
  })

  describe('variants', () => {
    it('lists every city in the export’s order with nothing typed, nothing ticked', () => {
      expect(
        citiesListed(
          CITIES,
          '',
          { ticked: NONE, tickedStates: NONE, sort: 'export' },
          VERDICTS
        ).map(({ name }) => name)
      ).toEqual(['Trier', 'Paris', 'Aachen'])
    })
  })

  describe('edge cases', () => {
    it('lists nothing when nothing is found, whatever the order', () => {
      expect(
        citiesListed(CITIES, 'zz', { ticked: NONE, tickedStates: NONE, sort: 'name' }, VERDICTS)
      ).toEqual([])
    })
  })

  // L3, L4: N/A — a composition of two pure functions, each tested on its own.
})
