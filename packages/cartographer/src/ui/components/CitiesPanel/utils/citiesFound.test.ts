import { describe, expect, it } from 'vitest'

import { citiesFound } from './citiesFound'

import type { CityHolder, CityMark } from '../../../../state/citiesSlice'

const EMPIRE: CityHolder = { name: 'Sacrum Imperium', wikidata: 'Q12548' }
const VENICE: CityHolder = { name: 'Repubblica di Venezia', wikidata: 'Q4948' }

/**
 * A city of 1100 and its holder.
 * @param name - its id and name
 * @param holder - its holder by the sources, or `null`
 * @returns the city
 */
function city(name: string, holder: CityHolder | null): CityMark {
  return {
    id: name,
    name,
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

const ISLES: CityHolder = { name: 'Kingdom of the Isles', wikidata: null }

const CITIES = [
  city('Metz', EMPIRE),
  city('Trèves', EMPIRE),
  city('Trévise', VENICE),
  city('Paris', null),
  city('Man', ISLES),
]

/**
 * The names of the cities found.
 * @param query - what is typed
 * @param ticked - the holders ticked
 * @returns their names
 */
function names(query: string, ticked: readonly string[]): string[] {
  return citiesFound(CITIES, query, new Set(ticked)).map(({ name }) => name)
}

// CARTO-360 and CARTO-370, `s20`: the name filter and the holders ticked apply together.
describe('citiesFound', () => {
  describe('happy path', () => {
    it('keeps the cities of the Empire when it is ticked', () => {
      expect(names('', ['wd:Q12548'])).toEqual(['Metz', 'Trèves'])
    })
  })

  describe('variants', () => {
    it('keeps every city with nothing typed and nothing ticked', () => {
      expect(names('', [])).toEqual(['Metz', 'Trèves', 'Trévise', 'Paris', 'Man'])
    })

    it('keeps the cities of either holder ticked', () => {
      expect(names('', ['wd:Q12548', 'wd:Q4948'])).toEqual(['Metz', 'Trèves', 'Trévise'])
    })

    it('applies both: « tre » under the Empire keeps Trèves, not Trévise', () => {
      expect(names('tre', ['wd:Q12548'])).toEqual(['Trèves'])
    })

    it('keeps the city of a holder with no Wikidata id under its name', () => {
      expect(names('', ['name:Kingdom of the Isles'])).toEqual(['Man'])
    })

    it('keeps the cities with no holder under « none »', () => {
      expect(names('', ['none'])).toEqual(['Paris'])
    })
  })

  // L3–L4: N/A — a pure filter.

  describe('edge cases', () => {
    it('keeps nothing under a holder that holds none of them', () => {
      expect(names('', ['wd:Q70972'])).toEqual([])
    })
  })
})
