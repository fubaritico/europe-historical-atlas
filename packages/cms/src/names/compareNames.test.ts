import { describe, expect, it } from 'vitest'

import { compareNames, foldName, wikidataItemsOf } from './compareNames'
import { readLabelsAnswer } from './wikidataLabels'

import type { ItemLabels } from './wikidataLabels'
import type { ContentPlace } from '@europe-historical-atlas/core/data/contentFormat'

/**
 * A place of the content.
 * @param id - its id
 * @param fr - its French name
 * @param wikidata - its item
 * @returns the place
 */
function place(id: string, fr: string, wikidata: string | null): ContentPlace {
  return { id, name: { fr, en: null }, lon: 0, lat: 0, wikidata, existsFrom: null, existsTo: null }
}

/**
 * Wikidata's names for an item.
 * @param fr - its French label
 * @param en - its English label
 * @param aliasesFr - its other French names
 * @param mul - its multilingual label
 * @returns the names
 */
function names(
  fr: string | null,
  en: string | null = null,
  aliasesFr: string[] = [],
  mul: string | null = null
): ItemLabels {
  return { fr, en, mul, aliasesFr }
}

const NONE_KEPT = new Map<number, string>()

describe('compareNames', () => {
  describe('happy path', () => {
    it('counts a place whose name is Wikidata’s French one, and lists one whose name differs', () => {
      const report = compareNames(
        [place('67', 'Ankara', 'Q3640'), place('2562', 'Pruse', 'Q83136')],
        new Map([
          ['Q3640', names('Ankara')],
          ['Q83136', names('Bursa', 'Bursa', ['Pruse'])],
        ]),
        NONE_KEPT
      )
      expect(report.same).toBe(1)
      expect(report.gaps).toEqual([
        {
          place: '2562',
          name: 'Pruse',
          wikidata: 'Q83136',
          wikidataName: 'Bursa',
          language: 'fr',
          alias: true,
        },
      ])
    })
  })

  describe('variants', () => {
    it('compares with the English label when Wikidata has no French one', () => {
      const report = compareNames(
        [place('1', 'Castillo de Onda', 'Q1'), place('2', 'Onda', 'Q2')],
        new Map([
          ['Q1', names(null, 'Castillo de Onda')],
          ['Q2', names(null, 'Onda Castle')],
        ]),
        NONE_KEPT
      )
      expect(report.same).toBe(1)
      expect(report.gaps.map((gap) => [gap.place, gap.language, gap.alias])).toEqual([
        ['2', 'en', false],
      ])
    })

    it('compares with the multilingual label when Wikidata has neither French nor English', () => {
      const report = compareNames(
        [place('1', 'Mazgirt', 'Q1'), place('2', 'Palu', 'Q2')],
        new Map([
          ['Q1', names(null, null, [], 'Mazgirt')],
          ['Q2', names(null, null, [], 'Palu (Elazığ)')],
        ]),
        NONE_KEPT
      )
      expect(report.same).toBe(1)
      expect(report.gaps.map((gap) => [gap.place, gap.language])).toEqual([['2', 'mul']])
    })

    it('leaves out a name already sorted and kept while it is the same name', () => {
      const report = compareNames(
        [place('5', 'Carrare', 'Q5')],
        new Map([['Q5', names('Carrara')]]),
        new Map([[5, 'Carrare']])
      )
      expect(report.kept).toBe(1)
      expect(report.gaps).toEqual([])
    })

    it('reads a place once however many dated sheets carry it', () => {
      const ankara = place('67', 'Ankara', 'Q3640')
      const report = compareNames(
        [ankara, ankara],
        new Map([['Q3640', names('Ankara')]]),
        NONE_KEPT
      )
      expect(report.places).toBe(1)
      expect(report.same).toBe(1)
    })
  })

  describe('managed errors', () => {
    it('lists a place whose item Wikidata does not know, apart from the names to sort', () => {
      const report = compareNames([place('9', 'Erbil', 'Q206236')], new Map(), NONE_KEPT)
      expect(report.unknown).toEqual([{ place: '9', name: 'Erbil', wikidata: 'Q206236' }])
      expect(report.gaps).toEqual([])
    })

    it('lists as unknown an item Wikidata answers `missing`, read from its answer (review QUAL-001)', () => {
      const labels = readLabelsAnswer({
        entities: {
          Q206236: { id: 'Q206236', missing: '' },
          Q3640: { labels: { fr: { value: 'Ankara' } } },
        },
      })
      const report = compareNames(
        [place('9', 'Erbil', 'Q206236'), place('67', 'Ankara', 'Q3640')],
        labels,
        NONE_KEPT
      )
      expect(report.unknown.map((item) => item.place)).toEqual(['9'])
      expect([report.same, report.noLabel]).toEqual([1, 0])
    })

    it('counts a place with no item, and one whose item has no French nor English name', () => {
      const report = compareNames(
        [place('1', 'Ici', null), place('2', 'Là', 'Q2')],
        new Map([['Q2', names(null)]]),
        NONE_KEPT
      )
      expect([report.noItem, report.noLabel, report.gaps.length]).toEqual([1, 1, 0])
    })
  })

  describe('unmanaged errors', () => {
    it('brings back a kept name once it changes: the sorting held for the old name only', () => {
      const report = compareNames(
        [place('5', 'Carrara (Toscane)', 'Q5')],
        new Map([['Q5', names('Carrara')]]),
        new Map([[5, 'Carrare']])
      )
      expect(report.kept).toBe(0)
      expect(report.gaps.map((gap) => gap.name)).toEqual(['Carrara (Toscane)'])
    })
  })

  describe('edge cases', () => {
    it('asks Wikidata for each item once, and for none of a place without one', () => {
      expect(
        wikidataItemsOf([
          place('1', 'A', 'Q1'),
          place('2', 'B', null),
          place('1', 'A', 'Q1'),
          place('3', 'C', 'Q1'),
          place('4', 'D', 'Q4'),
        ])
      ).toEqual(['Q1', 'Q4'])
    })

    it('takes accents, case and hyphens for the same name, and sorts the list by place', () => {
      expect(foldName('  Saint-Étienne ')).toBe(foldName('saint etienne'))
      const report = compareNames(
        [place('30', 'Zara', 'Q30'), place('4', 'Ancyre', 'Q4'), place('7', 'saint-etienne', 'Q7')],
        new Map([
          ['Q30', names('Zadar')],
          ['Q4', names('Ankara')],
          ['Q7', names('Saint-Étienne')],
        ]),
        NONE_KEPT
      )
      expect(report.same).toBe(1)
      expect(report.gaps.map((gap) => gap.place)).toEqual(['4', '30'])
    })
  })
})
