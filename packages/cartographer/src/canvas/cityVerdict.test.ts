import { describe, expect, it } from 'vitest'

import { addAnchor, closeRing } from '@europe-historical-atlas/core/editor/documentEdits'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { cityAlert, cityVerdicts } from './cityVerdict'

import type { CityMark } from '../state/citiesSlice'

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

// CARTO-389, the dev, 2026-11-08: the point says which cities need a source (red) or the map to change (yellow).
describe('cityAlert', () => {
  describe('happy path', () => {
    it('raises « missing » for a city nobody has entered a holder for', () => {
      expect(cityAlert('notEntered')).toBe('missing')
    })
  })

  describe('variants', () => {
    it('raises « toCorrect » for a city on the wrong side and for a holder the map lacks', () => {
      expect([cityAlert('misplaced'), cityAlert('toDeclare')]).toEqual(['toCorrect', 'toCorrect'])
    })

    it('raises nothing for a city where all is well', () => {
      expect(cityAlert('agrees')).toBeNull()
    })
  })

  // L3–L4: N/A — a total mapping of a closed union.

  describe('edge cases', () => {
    it('raises nothing when there is nothing to compare by, as the list marks nothing', () => {
      expect(cityAlert('cannotCompare')).toBeNull()
    })
  })
})
