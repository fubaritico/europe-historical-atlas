import { describe, expect, it } from 'vitest'

import { addAnchor, closeRing } from '@europe-historical-atlas/core/editor/documentEdits'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { byChain, cityAlert, cityVerdicts } from './cityVerdict'

import type { CityMark } from '../state/citiesSlice'
import type { ContentChainReading } from '@europe-historical-atlas/core/data/contentFormat'

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
  chain: null,
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

    // CARTO-435: a city with its chain is judged by it — before its holder, entered or not.
    it('judges a city by its chain when it has one, and hands the chain on with the verdict', () => {
      const chain = [{ titles: [{ name: 'Duc', wikidata: 'Q1' }], end: 'unknown' as const }]
      const agrees = cityVerdicts(withDuchy(), [{ ...CITY, chain }]).get('c')
      expect([agrees?.kind, agrees?.chain]).toEqual(['agrees', chain])
      const elsewhere = [{ titles: [{ name: 'Comte', wikidata: 'Q9' }], end: 'sovereign' as const }]
      const wrong = cityVerdicts(withDuchy(), [
        { ...CITY, holder: { name: 'Duchy', wikidata: 'Q1' }, chain: elsewhere },
      ]).get('c')
      expect(wrong?.kind).toBe('misplaced')
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
    // CARTO-435, the dev of 2026-11-15 on the white points: « we don't know » must never look like « right ».
    it('marks uncertain a city with nothing to compare by, or whose chain stops short — never plain', () => {
      expect([cityAlert('cannotCompare'), cityAlert('incomplete'), cityAlert('agrees')]).toEqual([
        'uncertain',
        'uncertain',
        null,
      ])
    })
  })
})

// CARTO-435, the dev's rule of 2026-11-15: if the polity drawn under the city is not in its chain, it is wrong.
describe('byChain', () => {
  const MAINZ = { name: 'Ruthard — archevêché de Mayence', wikidata: 'Q1' }
  const EMPIRE = { name: 'Henri IV — Saint-Empire', wikidata: 'Q12548' }
  const ERFURT: ContentChainReading[] = [{ titles: [MAINZ, EMPIRE], end: 'sovereign' }]

  describe('happy path', () => {
    it('agrees with Erfurt in Mainz, which its chain goes through', () => {
      expect(byChain(ERFURT, { name: 'Mainz', wikidata: 'Q1' })).toBe('agrees')
    })
  })

  describe('variants', () => {
    it('agrees where any reading goes through the polity — the sources diverging', () => {
      const two: ContentChainReading[] = [
        ...ERFURT,
        { titles: [{ name: 'Thuringia', wikidata: 'Q2' }], end: 'sovereign' },
      ]
      expect(byChain(two, { name: 'Thuringia', wikidata: 'Q2' })).toBe('agrees')
    })

    it('says incomplete, not wrong, where the chain stops for want of a link', () => {
      const short: ContentChainReading[] = [{ titles: [MAINZ], end: 'unknown' }]
      expect(byChain(short, { name: 'Thuringia', wikidata: 'Q2' })).toBe('incomplete')
    })
  })

  describe('managed errors', () => {
    it('finds Erfurt wrong in Thuringia, though Thuringia answers to the Empire too', () => {
      expect(byChain(ERFURT, { name: 'Thuringia', wikidata: 'Q2' })).toBe('misplaced')
    })

    it('finds a city wrong over ground nobody claims', () => {
      expect(byChain(ERFURT, null)).toBe('misplaced')
    })
  })

  describe('unmanaged errors', () => {
    it('cannot look for a polity with no Wikidata id — never agrees by default', () => {
      expect(byChain(ERFURT, { name: 'Thuringia', wikidata: null })).toBe('cannotCompare')
    })
  })

  describe('edge cases', () => {
    it('finds wrong a chain whose links contradict one another, the polity not in it', () => {
      const loop: ContentChainReading[] = [{ titles: [MAINZ, EMPIRE, MAINZ], end: 'loop' }]
      expect(byChain(loop, { name: 'Thuringia', wikidata: 'Q2' })).toBe('misplaced')
    })
  })
})
