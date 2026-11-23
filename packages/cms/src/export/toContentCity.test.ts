import { describe, expect, it } from 'vitest'

import {
  CONTENT_FORMAT_VERSION,
  contentFileSchema,
} from '@europe-historical-atlas/core/data/contentFormat'

import { chainRegister } from './toContentChain'
import { toContentCity } from './toContentCity'

import type { DocCitySheet } from './toContentCity'

/** No title, no link: every city's chain reads `null` unless a test gives its own register. */
const NO_CHAIN = chainRegister([], [])

/** Rome, as Payload answers it with every locale. */
const ROME_PLACE = {
  id: 5,
  name: { fr: 'Rome', en: 'Rome' },
  otherNames: [{ language: 'en', form: 'Rome' }],
  location: [12.48, 41.89] as [number, number],
  wikidata: 'Q220',
}

/** Buringh, as Payload answers it. */
const BURINGH = { id: 4, title: 'Buringh 2021', author: 'Eltjo Buringh', url: null }

/** A reason, with every locale. */
const BISHOPRIC = { id: 3, name: { fr: 'Évêché', en: null } }

/** A confession, with every locale (CMS-433). */
const JEWISH = { id: 9, name: { fr: 'juive', en: 'Jewish' } }

/**
 * Rome in 1100, as the export reads it: every relation resolved, every locale.
 * @param overrides - what a test changes
 * @returns the sheet
 */
function rome(overrides: Partial<DocCitySheet> = {}): DocCitySheet {
  return {
    id: 1,
    place: ROME_PLACE,
    date: {
      start: { year: 1100, month: null, day: null, circa: true, margin: null, calendar: 'julian' },
    },
    importance: 'capital',
    reasons: [BISHOPRIC],
    testimonies: [
      {
        id: 'r1',
        source: BURINGH,
        subject: 'population',
        population: 35000,
        importance: null,
        reason: null,
        where: 'p. 12',
      },
    ],
    periodName: null,
    showInAtlas: true,
    ...overrides,
  }
}

describe('toContentCity', () => {
  describe('happy path', () => {
    it('writes Rome in 1100 with its place, its reasons and its source’s line joined in', () => {
      expect(toContentCity(rome(), NO_CHAIN)).toEqual({
        id: '1',
        place: {
          id: '5',
          name: { fr: 'Rome', en: 'Rome' },
          lon: 12.48,
          lat: 41.89,
          wikidata: 'Q220',
          existsFrom: null,
          existsTo: null,
        },
        date: {
          kind: 'instant',
          at: { year: 1100, month: null, day: null, calendar: null, circa: true, margin: null },
        },
        importance: 'capital',
        reasons: [{ fr: 'Évêché', en: null }],
        testimonies: [
          {
            source: { id: '4', title: 'Buringh 2021', author: 'Eltjo Buringh', url: null },
            where: 'p. 12',
            quotation: null,
            subject: 'population',
            population: 35000,
          },
        ],
        holder: null,
        chain: null,
        communities: [],
        periodName: null,
        showInAtlas: true,
      })
    })

    it('writes a city core’s content schema accepts', () => {
      const file = {
        version: CONTENT_FORMAT_VERSION,
        events: [],
        cities: [toContentCity(rome(), NO_CHAIN)],
      }
      expect(contentFileSchema.safeParse(file).success).toBe(true)
    })
  })

  describe('variants', () => {
    it('names a line’s reason, and keeps a line about the importance', () => {
      const lines = [
        { source: BURINGH, subject: 'reason' as const, reason: BISHOPRIC, where: null },
        {
          source: BURINGH,
          subject: 'importance' as const,
          importance: 'large-city' as const,
          where: '',
        },
      ]
      expect(toContentCity(rome({ testimonies: lines }), NO_CHAIN).testimonies).toEqual([
        {
          source: expect.objectContaining({ id: '4' }) as unknown,
          where: null,
          quotation: null,
          subject: 'reason',
          reason: { fr: 'Évêché', en: null },
        },
        {
          source: expect.objectContaining({ id: '4' }) as unknown,
          where: null,
          quotation: null,
          subject: 'importance',
          importance: 'large-city',
        },
      ])
    })

    it('writes the holder, its quoted line, and a holder with no Wikidata id', () => {
      const line = {
        source: BURINGH,
        subject: 'holder' as const,
        holderName: 'Republic of Venice',
        holderQid: 'Q4948',
        where: 'p. 33',
        quotation: 'the doge rules in the name of the emperor',
      }
      const city = toContentCity(
        rome({ testimonies: [line], holderName: 'Republic of Venice', holderQid: 'Q4948' }),
        NO_CHAIN
      )
      expect(city.holder).toEqual({ name: 'Republic of Venice', wikidata: 'Q4948' })
      expect(city.testimonies).toEqual([
        {
          source: expect.objectContaining({ id: '4' }) as unknown,
          where: 'p. 33',
          quotation: 'the doge rules in the name of the emperor',
          subject: 'holder',
          holder: { name: 'Republic of Venice', wikidata: 'Q4948' },
        },
      ])
      const nameOnly = toContentCity(
        rome({ holderName: 'Norse Greenland', holderQid: '' }),
        NO_CHAIN
      )
      expect(nameOnly.holder).toEqual({ name: 'Norse Greenland', wikidata: null })
    })

    it('writes a holder line whose Wikidata id was emptied as one with none', () => {
      const line = {
        source: BURINGH,
        subject: 'holder' as const,
        holderName: 'Norse Greenland',
        holderQid: '',
        where: null,
      }
      expect(toContentCity(rome({ testimonies: [line] }), NO_CHAIN).testimonies[0]).toMatchObject({
        holder: { name: 'Norse Greenland', wikidata: null },
      })
    })

    it('writes no holder for a sheet whose holder was emptied in the admin', () => {
      expect(toContentCity(rome({ holderName: '', holderQid: '' }), NO_CHAIN).holder).toBeNull()
    })

    // CMS-391, the dev, 2026-11-08: unticked by default, the atlas shows only the cities ticked.
    // CMS-495: the sheet's name of the time, written in as its forms by language.
    it('writes the name of the time the sheet points at, a form a language', () => {
      const ancyre = {
        id: 1,
        forms: [
          { id: 'a', language: 'fr', form: 'Ancyre' },
          { id: 'b', language: 'en', form: 'Ancyra' },
        ],
      }
      expect(toContentCity(rome({ periodName: ancyre }), NO_CHAIN).periodName).toEqual([
        { language: 'fr', form: 'Ancyre' },
        { language: 'en', form: 'Ancyra' },
      ])
    })

    it('writes no name of the time for a sheet that names none', () => {
      expect(toContentCity(rome(), NO_CHAIN).periodName).toBeNull()
    })

    it('writes Rome unticked when its box is not ticked', () => {
      expect(toContentCity(rome({ showInAtlas: false }), NO_CHAIN).showInAtlas).toBe(false)
    })

    it('writes a city with no reason and no line', () => {
      const city = toContentCity(rome({ reasons: null, testimonies: null }), NO_CHAIN)
      expect([city.reasons, city.testimonies]).toEqual([[], []])
    })

    // CMS-433: a community and its line, the confession named in both; its weight and its mark as entered.
    it('writes a community and the line naming it, the confession named, its weight supposed', () => {
      const city = toContentCity(
        rome({
          testimonies: [
            {
              id: 'r2',
              source: BURINGH,
              subject: 'community',
              confession: JEWISH,
              where: null,
              quotation: 'the Jewish quarter',
            },
          ],
          communities: [{ id: 'c1', confession: JEWISH, weight: 'present', weightAttested: false }],
        }),
        NO_CHAIN
      )

      expect([city.communities, city.testimonies[0]]).toEqual([
        [{ confession: { fr: 'juive', en: 'Jewish' }, weight: 'present', weightAttested: false }],
        {
          source: { id: '4', title: 'Buringh 2021', author: 'Eltjo Buringh', url: null },
          where: null,
          quotation: 'the Jewish quarter',
          subject: 'community',
          confession: { fr: 'juive', en: 'Jewish' },
        },
      ])
      expect(
        contentFileSchema.safeParse({
          version: CONTENT_FORMAT_VERSION,
          events: [],
          cities: [city],
        }).success
      ).toBe(true)
    })
  })

  describe('managed errors', () => {
    // CMS-391: a base the server has not brought up to date has no box — every city would leave the atlas unseen.
    it('stops on a sheet with no « show in the atlas » box, naming it and the remedy', () => {
      expect(() => toContentCity(rome({ showInAtlas: null }), NO_CHAIN)).toThrow(
        'city sheet 1: no « show in the atlas » box — start the CMS once'
      )
    })

    it('stops on a sheet the schema refuses, naming it and where', () => {
      const line = { source: BURINGH, subject: 'population' as const, population: null }
      expect(() => toContentCity(rome({ testimonies: [line] }), NO_CHAIN)).toThrow(
        /city sheet 1: refused by the schema: testimonies\.0\.population/
      )
    })

    it('stops on a sheet whose date does not read', () => {
      expect(() => toContentCity(rome({ date: { start: { year: 0 } } }), NO_CHAIN)).toThrow(
        'city sheet 1: its date does not read'
      )
    })

    it('stops on a community no line names, naming the sheet and where', () => {
      expect(() =>
        toContentCity(
          rome({ communities: [{ confession: JEWISH, weight: 'dominant', weightAttested: true }] }),
          NO_CHAIN
        )
      ).toThrow('communities.0.confession')
    })
  })

  describe('unmanaged errors', () => {
    it('stops on a place the query did not resolve — the atlas never joins', () => {
      expect(() => toContentCity(rome({ place: 5 }), NO_CHAIN)).toThrow(
        'city sheet 1, place: not resolved (5)'
      )
    })

    it('stops on a name of the time the query did not resolve, and on one with no form', () => {
      expect(() => toContentCity(rome({ periodName: 7 }), NO_CHAIN)).toThrow(
        '[CMS] city sheet 1, name of the time: not resolved (7)'
      )
      expect(() => toContentCity(rome({ periodName: { id: 7, forms: [] } }), NO_CHAIN)).toThrow(
        '[CMS] city sheet 1: its name of the time 7 has no form'
      )
    })

    it('stops on a reason the query did not resolve', () => {
      expect(() => toContentCity(rome({ reasons: [3] }), NO_CHAIN)).toThrow('not resolved (3)')
    })

    it('stops on a confession the query did not resolve', () => {
      expect(() =>
        toContentCity(
          rome({
            testimonies: [{ source: BURINGH, subject: 'community', confession: 9 }],
            communities: [{ confession: 9, weight: 'present', weightAttested: true }],
          }),
          NO_CHAIN
        )
      ).toThrow('not resolved (9)')
    })
  })

  describe('edge cases', () => {
    it('stops on a place with no French name', () => {
      const place = { ...ROME_PLACE, name: { fr: '', en: 'Rome' } }
      expect(() => toContentCity(rome({ place }), NO_CHAIN)).toThrow('place 5: no French text')
    })

    // CMS-495: the table is the English name's home since 2026-11-23; a row typed through the language switch is not.
    it('writes the English name of the table, never the localized English row', () => {
      const place = {
        ...ROME_PLACE,
        name: { fr: 'Ankara', en: 'Ancyra' },
        otherNames: [{ language: 'en', form: 'Ankara' }],
      }
      expect(toContentCity(rome({ place }), NO_CHAIN).place.name).toEqual({
        fr: 'Ankara',
        en: 'Ankara',
      })
    })

    it('writes no English name for a place whose table has none', () => {
      const place = { ...ROME_PLACE, otherNames: [] }
      expect(toContentCity(rome({ place }), NO_CHAIN).place.name).toEqual({ fr: 'Rome', en: null })
    })
  })
})
