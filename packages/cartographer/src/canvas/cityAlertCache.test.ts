import { describe, expect, it, vi } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { citiesToPaint, createCityAlertCache } from './cityAlertCache'
import { testStore } from './testGestureContext'

import type { CityMark } from '../state/citiesSlice'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

const in1100 = {
  kind: 'instant',
  at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
} as const
/** France holds 0–2° E, the Empire 2–4° E, both 46–48° N (the fixture). */
const FRANCE = { name: 'Reaume de France', wikidata: 'Q70972' }
const EMPIRE = { name: 'Sacrum Imperium', wikidata: 'Q12548' }
const METZ: CityMark = {
  id: 'metz',
  name: 'Metz',
  lon: 3,
  lat: 47,
  date: in1100,
  holder: EMPIRE,
  holderSources: [],
}
const PARIS: CityMark = { ...METZ, id: 'paris', name: 'Paris', lon: 1, holder: null }
/** Metz given to France by the sources, while the map has it in the Empire. */
const METZ_FRENCH: CityMark = { ...METZ, holder: FRANCE }

/**
 * The two-polity fixture of 1100, its polities given their Wikidata ids.
 * @returns the document
 */
function documentWithIds(): YearDocument {
  const document = sharedBorderDocument()
  for (const polity of document.polities)
    polity.wikidata = polity.id === 'hre' ? EMPIRE.wikidata : FRANCE.wikidata
  return document
}

// CARTO-389: each city's alert, kept for one document version — a pan repaints on every pointer move.
describe('createCityAlertCache', () => {
  describe('happy path', () => {
    it('alerts Paris, with no holder, as missing, and leaves Metz, at the right place, without alert', () => {
      const alerts = createCityAlertCache().alertsOf(documentWithIds(), 0, [PARIS, METZ])
      expect([...alerts]).toEqual([['paris', 'missing']])
    })
  })

  describe('variants', () => {
    it('alerts Metz as to correct when the sources give it to France and the map to the Empire', () => {
      const alerts = createCityAlertCache().alertsOf(documentWithIds(), 0, [METZ_FRENCH])
      expect(alerts.get('metz')).toBe('toCorrect')
    })

    it('answers the same alerts, without computing them again, for the same version', () => {
      const cache = createCityAlertCache()
      const document = documentWithIds()
      const cities = [PARIS, METZ]
      expect(cache.alertsOf(document, 3, cities)).toBe(cache.alertsOf(document, 3, cities))
    })

    it('computes them again once a border is moved: Metz into France, its alert gone', () => {
      const store = testStore(documentWithIds())
      const cache = createCityAlertCache()
      const cities = [METZ_FRENCH]
      const before = cache.alertsOf(store.getState().document, store.getState().version, cities)
      store.getState().moveAnchors(
        [
          { index: 1, to: [4, 48] },
          { index: 2, to: [4, 46] },
        ],
        { kind: 'move-anchor', label: 'move anchor' }
      )
      const after = cache.alertsOf(store.getState().document, store.getState().version, cities)
      expect([before.get('metz'), after.get('metz')]).toEqual(['toCorrect', undefined])
    })

    it('computes them again when the cities are read again', () => {
      const cache = createCityAlertCache()
      const document = documentWithIds()
      cache.alertsOf(document, 0, [METZ])
      expect(cache.alertsOf(document, 0, [PARIS]).get('paris')).toBe('missing')
    })
  })

  // L3–L4: N/A — a verdict per city, nothing refused.

  describe('edge cases', () => {
    it('alerts no city of another year', () => {
      const later: CityMark = { ...PARIS, date: { ...in1100, at: { ...in1100.at, year: 1200 } } }
      expect(createCityAlertCache().alertsOf(documentWithIds(), 0, [later]).size).toBe(0)
    })

    it('alerts nothing when no city is read', () => {
      expect(createCityAlertCache().alertsOf(documentWithIds(), 0, []).size).toBe(0)
    })
  })
})

/**
 * The state of a store with Paris shown, drawn as points or not.
 * @param asPoints - whether the cities are points
 * @returns the state
 */
function state(asPoints: boolean) {
  return {
    document: documentWithIds(),
    version: 0,
    cities: [PARIS],
    shownCities: new Set(['paris']),
    citiesAsPoints: asPoints,
    listedCities: null,
  }
}

// CARTO-389, review ARCH-001: the alerts are asked only where they are drawn.
describe('citiesToPaint', () => {
  it('hands Paris, shown as a point, its « missing » alert', () => {
    expect(citiesToPaint(state(true), createCityAlertCache())[0]?.alert).toBe('missing')
  })

  it('asks the cache nothing, and gives Paris no alert, when it is written by its name', () => {
    const cache = createCityAlertCache()
    const asked = vi.spyOn(cache, 'alertsOf')
    expect(citiesToPaint(state(false), cache)[0]?.alert).toBeNull()
    expect(asked).not.toHaveBeenCalled()
  })
})
