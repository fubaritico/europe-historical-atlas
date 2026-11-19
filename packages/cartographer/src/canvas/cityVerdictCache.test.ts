import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { createCityVerdictCache } from './cityVerdictCache'
import { testStore } from './testGestureContext'

import type { CityMark } from '../state/citiesSlice'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/** France holds 0–2° E, the Empire 2–4° E, both 46–48° N (the fixture). */
const FRANCE = { name: 'Reaume de France', wikidata: 'Q70972' }
const EMPIRE = { name: 'Sacrum Imperium', wikidata: 'Q12548' }
const METZ: CityMark = {
  id: 'metz',
  name: 'Metz',
  lon: 3,
  lat: 47,
  date: {
    kind: 'instant',
    at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
  },
  holder: EMPIRE,
  chain: null,
  holderSources: [],
}
const PARIS: CityMark = { ...METZ, id: 'paris', name: 'Paris', lon: 1, holder: FRANCE }

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

// CARTO-485: the verdicts kept for one state of the map — the panel renders at every box ticked.
describe('createCityVerdictCache', () => {
  describe('happy path', () => {
    it('judges Paris in France and Metz in the Empire, each at the right place', () => {
      const verdicts = createCityVerdictCache().verdictsOf(documentWithIds(), 0, [PARIS, METZ])
      expect([verdicts.get('paris')?.kind, verdicts.get('metz')?.kind]).toEqual([
        'agrees',
        'agrees',
      ])
    })
  })

  describe('variants', () => {
    it('answers the very same verdicts for the same map, version and cities', () => {
      const cache = createCityVerdictCache()
      const document = documentWithIds()
      const cities = [PARIS, METZ]
      expect(cache.verdictsOf(document, 0, cities)).toBe(cache.verdictsOf(document, 0, cities))
    })

    it('judges again once a border is moved: Metz, moved into France, is misplaced', () => {
      const store = testStore(documentWithIds())
      const cache = createCityVerdictCache()
      const cities = [METZ]
      const before = cache.verdictsOf(store.getState().document, store.getState().version, cities)
      store.getState().moveAnchors(
        [
          { index: 1, to: [4, 48] },
          { index: 2, to: [4, 46] },
        ],
        { kind: 'move-anchor', label: 'move anchor' }
      )
      const after = cache.verdictsOf(store.getState().document, store.getState().version, cities)
      expect([before.get('metz')?.kind, after.get('metz')?.kind]).toEqual(['agrees', 'misplaced'])
    })

    it('judges again when the cities are read again', () => {
      const cache = createCityVerdictCache()
      const document = documentWithIds()
      const first = cache.verdictsOf(document, 0, [METZ])
      expect(cache.verdictsOf(document, 0, [{ ...METZ, holder: FRANCE }])).not.toBe(first)
    })
  })

  // L3, L4: N/A — a memory over `cityVerdicts`, which cannot fail.

  describe('edge cases', () => {
    // Two maps both start at version 0: the version alone would hand one map the other's verdicts.
    it('judges again for another map at the same version', () => {
      const cache = createCityVerdictCache()
      const cities = [METZ]
      const first = cache.verdictsOf(documentWithIds(), 0, cities)
      expect(cache.verdictsOf(documentWithIds(), 0, cities)).not.toBe(first)
    })

    it('judges nothing with no city', () => {
      expect(createCityVerdictCache().verdictsOf(documentWithIds(), 0, []).size).toBe(0)
    })
  })
})
