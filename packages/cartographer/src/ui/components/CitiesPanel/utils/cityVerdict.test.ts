import { describe, expect, it } from 'vitest'

import { addAnchor, closeRing } from '@europe-historical-atlas/core/editor/documentEdits'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { cityVerdicts } from './cityVerdict'

import type { CityMark } from '../../../../state/citiesSlice'

const in1100 = {
  kind: 'instant',
  at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
} as const

/**
 * The two-polity fixture with a duchy drawn inside France, over 0.5–1.5° E, 46.5–47.5° N, painted after it.
 * @returns the document
 */
function withDuchy() {
  const document = sharedBorderDocument()
  const first = document.anchors.length
  for (const point of [
    [0.5, 47.5],
    [1.5, 47.5],
    [1.5, 46.5],
    [0.5, 46.5],
  ] as [number, number][])
    addAnchor(document, point, 0)
  document.polities.push({
    id: 'duchy',
    name: 'Duché',
    rank: 'duchy',
    status: 'country',
    suzerain: 'fr-couronne',
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: 'Q1',
  })
  closeRing(document, 'duchy', [first, first + 1, first + 2, first + 3])
  return document
}

const CITY: CityMark = {
  id: 'c',
  name: 'C',
  lon: 1,
  lat: 47,
  date: in1100,
  holder: null,
  holderSources: [],
}

// CARTO-193: the polity under a city is the one painted last, as on the canvas.
describe('cityVerdicts', () => {
  describe('happy path', () => {
    it('gives a city inside a duchy drawn over France to the duchy, painted last', () => {
      expect(cityVerdicts(withDuchy(), [CITY]).get('c')?.onMap).toEqual({
        name: 'Duché',
        wikidata: 'Q1',
      })
    })
  })

  describe('variants', () => {
    it('agrees with sources naming the duchy by its id', () => {
      const verdict = cityVerdicts(withDuchy(), [
        { ...CITY, holder: { name: 'Duchy', wikidata: 'Q1' } },
      ])
      expect(verdict.get('c')?.kind).toBe('agrees')
    })
  })

  // L3, L4: N/A — rings and a point.

  describe('edge cases', () => {
    it('gives a city of France outside the duchy to France', () => {
      expect(cityVerdicts(withDuchy(), [{ ...CITY, lon: 0.2 }]).get('c')?.onMap?.name).toBe(
        'Reaume de France'
      )
    })
  })
})
