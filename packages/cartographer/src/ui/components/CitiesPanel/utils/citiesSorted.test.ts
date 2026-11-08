import { describe, expect, it } from 'vitest'

import { citiesSorted } from './citiesSorted'

import type { CityVerdict, CityVerdictKind } from '../../../../canvas/cityVerdict'
import type { CityHolder, CityMark } from '../../../../state/citiesSlice'

const EMPIRE: CityHolder = { name: 'Sacrum Imperium', wikidata: 'Q12548' }
const FRANCE: CityHolder = { name: 'Reaume de France', wikidata: 'Q70972' }

/**
 * A city of 1100.
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

/** In the export's order: Metz, Évreux, Paris, Aachen, Trier. */
const CITIES = [
  city('Metz', EMPIRE),
  city('Évreux', FRANCE),
  city('Paris', null),
  city('Aachen', EMPIRE),
  city('Trier', EMPIRE),
]

/** Each city's verification. */
const VERDICTS: ReadonlyMap<string, CityVerdict> = new Map(
  (
    [
      ['Metz', 'agrees'],
      ['Évreux', 'misplaced'],
      ['Paris', 'notEntered'],
      ['Aachen', 'toDeclare'],
      ['Trier', 'agrees'],
    ] as const satisfies readonly (readonly [string, CityVerdictKind])[]
  ).map(([id, kind]) => [id, { onMap: null, bySources: null, kind }])
)

const names = (sort: Parameters<typeof citiesSorted>[1]): string[] =>
  citiesSorted(CITIES, sort, VERDICTS).map(({ name }) => name)

// CARTO-382, `s20`: the list in the order chosen.
describe('citiesSorted', () => {
  describe('happy path', () => {
    it('sorts by name, the accent ignored: Évreux between Aachen and Metz', () => {
      expect(names('name')).toEqual(['Aachen', 'Évreux', 'Metz', 'Paris', 'Trier'])
    })
  })

  describe('variants', () => {
    it('keeps the export’s order as it comes', () => {
      expect(names('export')).toEqual(['Metz', 'Évreux', 'Paris', 'Aachen', 'Trier'])
    })

    it('puts the map to correct first, then no holder, then the right place', () => {
      expect(names('verification')).toEqual(['Évreux', 'Aachen', 'Paris', 'Metz', 'Trier'])
    })

    it('groups by holder by the sources, by name, the cities with no holder last', () => {
      expect(names('holder')).toEqual(['Évreux', 'Metz', 'Aachen', 'Trier', 'Paris'])
    })
  })

  describe('edge cases', () => {
    it('keeps the export’s order between cities that compare equal — Metz before Trier at the right place', () => {
      const atTheRightPlace = names('verification').filter(
        (name) => name === 'Metz' || name === 'Trier'
      )
      expect(atTheRightPlace).toEqual(['Metz', 'Trier'])
    })

    it('leaves the list it was given as it was', () => {
      const given = [...CITIES]
      citiesSorted(given, 'name', VERDICTS)
      expect(given.map(({ name }) => name)).toEqual(['Metz', 'Évreux', 'Paris', 'Aachen', 'Trier'])
    })

    it('puts last a city with no verdict', () => {
      const lost = city('Nowhere', EMPIRE)
      expect(citiesSorted([lost, ...CITIES], 'verification', VERDICTS).at(-1)?.name).toBe('Nowhere')
    })
  })

  // L3, L4: N/A — a pure order over values already validated.
})
