import { describe, expect, it } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { UNFRAMED } from '../viewport/viewport'

import { citiesOfYear, shownCityPoints } from './citiesSlice'
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
        { name: 'Lyon', lonLat: [4.83, 45.76] },
      ])
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
