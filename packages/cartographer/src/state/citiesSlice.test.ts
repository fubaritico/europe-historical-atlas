import { describe, expect, it } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { UNFRAMED } from '../viewport/viewport'

import { NO_HOLDER, citiesOfYear, holderKey, shownCityPoints } from './citiesSlice'
import { openEmptyYear } from './openEmptyYear'
import { createCartographerStore } from './store'

import type { CityMark } from './citiesSlice'
import type { HistoricalMoment } from '@europe-historical-atlas/core/time/historicalDate'

const moment = (year: number): HistoricalMoment => ({
  year,
  month: null,
  day: null,
  calendar: null,
  circa: false,
  margin: null,
})
const LYON: CityMark = {
  id: 'lyon',
  name: 'Lyon',
  lon: 4.83,
  lat: 45.76,
  date: { kind: 'instant', at: moment(1100) },
  holder: null,
  holderSources: [],
}
const ZADAR: CityMark = {
  id: 'zadar',
  name: 'Zadar',
  lon: 15.23,
  lat: 44.12,
  date: { kind: 'interval', from: moment(1099), to: moment(1105) },
  holder: null,
  holderSources: [],
}
/**
 * A store on an empty 1100.
 * @returns the store
 */
function testStore() {
  return createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
}

const PARIS_1200: CityMark = {
  id: 'paris',
  name: 'Paris',
  lon: 2.35,
  lat: 48.86,
  date: { kind: 'instant', at: moment(1200) },
  holder: null,
  holderSources: [],
}

// CARTO-193, the dev, 2026-11-02: the cities as guides, none shown at opening, each by its own eye.
describe('citiesSlice', () => {
  describe('happy path', () => {
    it('opens loading, with no city and none shown', () => {
      const state = testStore().getState()
      expect([state.citiesLoad, state.cities, state.shownCities.size]).toEqual([
        { state: 'loading' },
        [],
        0,
      ])
    })

    it('shows Lyon on its eye and hides it again', () => {
      const store = testStore()
      store.getState().setCities([LYON])
      store.getState().setCityShown('lyon', true)
      expect(store.getState().shownCities.has('lyon')).toBe(true)
      store.getState().setCityShown('lyon', false)
      expect(store.getState().shownCities.has('lyon')).toBe(false)
    })
  })

  describe('variants', () => {
    it('keeps the cities of 1100 on 1100: a year alone, and an interval covering it', () => {
      expect(citiesOfYear([LYON, ZADAR, PARIS_1200], 1100).map(({ id }) => id)).toEqual([
        'lyon',
        'zadar',
      ])
      expect(citiesOfYear([LYON, ZADAR, PARIS_1200], 1200).map(({ id }) => id)).toEqual(['paris'])
    })

    it('shows several cities at once, and hides them at once', () => {
      const store = testStore()
      store.getState().setCitiesShown(['lyon', 'zadar'], true)
      expect([...store.getState().shownCities].sort()).toEqual(['lyon', 'zadar'])
      store.getState().setCitiesShown(['lyon', 'zadar'], false)
      expect(store.getState().shownCities.size).toBe(0)
    })

    it('gives the canvas the shown cities of the year open only, longitude first', () => {
      expect(shownCityPoints([LYON, ZADAR, PARIS_1200], new Set(['lyon', 'paris']), 1100)).toEqual([
        { id: 'lyon', name: 'Lyon', lonLat: [4.83, 45.76], holder: null },
      ])
    })

    it('draws the cities as points, or as a dot and its name', () => {
      const store = testStore()
      store.getState().setCitiesAsPoints(true)

      expect(store.getState().citiesAsPoints).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('says the cities failed, and shows none', () => {
      const store = testStore()
      store.getState().setCityShown('lyon', true)
      store.getState().setCitiesFailed('HTTP 404')
      const state = store.getState()
      expect([state.citiesLoad, state.cities, state.shownCities.size]).toEqual([
        { state: 'failed', reason: 'HTTP 404' },
        [],
        0,
      ])
    })
  })

  // L4: N/A — plain values; the load's failures are cityLoad's.

  describe('edge cases', () => {
    it('stays out of the undo line: showing a city leaves the version as it was', () => {
      const store = testStore()
      const version = store.getState().version
      store.getState().setCityShown('lyon', true)
      expect(store.getState().version).toBe(version)
    })
  })
})

// CARTO-370, `s20`: the holders ticked in the advanced filters, keyed by Wikidata id, out of the undo line.
describe('citiesSlice — the holders ticked', () => {
  describe('happy path', () => {
    it('ticks the Empire then unticks it', () => {
      const store = testStore()
      store.getState().setCityHolderTicked('wd:Q12548', true)
      expect([...store.getState().cityHolders]).toEqual(['wd:Q12548'])
      store.getState().setCityHolderTicked('wd:Q12548', false)
      expect(store.getState().cityHolders.size).toBe(0)
    })
  })

  describe('variants', () => {
    it('unticks every holder and every state at once', () => {
      const store = testStore()
      store.getState().setCityHolderTicked('wd:Q12548', true)
      store.getState().setCityHolderTicked(NO_HOLDER, true)
      store.getState().setCityStateTicked('misplaced', true)
      store.getState().untickCityFilters()
      expect(store.getState().cityHolders.size).toBe(0)
      expect(store.getState().cityStates.size).toBe(0)
    })

    // CARTO-369: the states ticked, as the holders are.
    it('ticks « not at the right place » and « to declare », then unticks the first', () => {
      const store = testStore()
      store.getState().setCityStateTicked('misplaced', true)
      store.getState().setCityStateTicked('toDeclare', true)
      store.getState().setCityStateTicked('misplaced', false)
      expect([...store.getState().cityStates]).toEqual(['toDeclare'])
    })

    it('keys a holder by its Wikidata id, by its name without one, and « none » when not entered', () => {
      expect([
        holderKey({ name: 'Saint-Empire', wikidata: 'Q12548' }),
        holderKey({ name: 'Taïfa de Molina', wikidata: null }),
        holderKey(null),
      ]).toEqual(['wd:Q12548', 'name:Taïfa de Molina', 'none'])
    })
  })

  // L3–L4: N/A — plain values, nothing refused.

  describe('edge cases', () => {
    it('stays out of the undo line: ticking a holder leaves the version as it was', () => {
      const store = testStore()
      const version = store.getState().version
      store.getState().setCityHolderTicked('wd:Q12548', true)
      expect(store.getState().version).toBe(version)
    })

    it('keys two holders of one Wikidata id alike, whatever their names', () => {
      expect(holderKey({ name: 'Empire', wikidata: 'Q12548' })).toBe(
        holderKey({ name: 'Sacrum Imperium', wikidata: 'Q12548' })
      )
    })
  })
})

// CARTO-384, the dev, 2026-11-07: a click on a city's point chooses it in {Cities}; a double-click opens its box.
describe('citiesSlice — the city chosen and the city opened', () => {
  describe('happy path', () => {
    it('chooses Lyon, none opened', () => {
      const store = testStore()
      store.getState().selectCity('lyon')
      expect([store.getState().selectedCity, store.getState().openedCity]).toEqual(['lyon', null])
    })

    it('opens Lyon, and chooses it with it', () => {
      const store = testStore()
      store.getState().openCity('lyon')
      expect([store.getState().selectedCity, store.getState().openedCity]).toEqual(['lyon', 'lyon'])
    })
  })

  describe('variants', () => {
    it('closes the box and keeps Lyon chosen', () => {
      const store = testStore()
      store.getState().openCity('lyon')
      store.getState().closeCity()
      expect([store.getState().selectedCity, store.getState().openedCity]).toEqual(['lyon', null])
    })

    it('chooses none', () => {
      const store = testStore()
      store.getState().selectCity('lyon')
      store.getState().selectCity(null)
      expect(store.getState().selectedCity).toBeNull()
    })

    it('opens Zadar over Lyon: one box, the city last opened', () => {
      const store = testStore()
      store.getState().openCity('lyon')
      store.getState().openCity('zadar')
      expect([store.getState().selectedCity, store.getState().openedCity]).toEqual([
        'zadar',
        'zadar',
      ])
    })
  })

  // L3–L4: N/A — plain values, nothing refused.

  describe('edge cases', () => {
    it('opens nothing and chooses nothing at opening', () => {
      const store = testStore()
      expect([store.getState().selectedCity, store.getState().openedCity]).toEqual([null, null])
    })

    it('stays out of the undo line: choosing and opening a city leave the version as it was', () => {
      const store = testStore()
      const version = store.getState().version
      store.getState().openCity('lyon')
      expect(store.getState().version).toBe(version)
    })
  })
})
