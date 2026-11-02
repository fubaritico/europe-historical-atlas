import { describe, expect, it } from 'vitest'

import {
  CONTENT_FORMAT_VERSION,
  contentFileSchema,
} from '@europe-historical-atlas/core/data/contentFormat'

import { toContentCity } from './toContentCity'

import type { DocCitySheet } from './toContentCity'

/** Rome, as Payload answers it with every locale. */
const ROME_PLACE = {
  id: 5,
  name: { fr: 'Rome', en: 'Rome' },
  location: [12.48, 41.89] as [number, number],
  wikidata: 'Q220',
}

/** Buringh, as Payload answers it. */
const BURINGH = { id: 4, title: 'Buringh 2021', author: 'Eltjo Buringh', url: null }

/** A reason, with every locale. */
const BISHOPRIC = { id: 3, name: { fr: 'Évêché', en: null } }

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
    ...overrides,
  }
}

describe('toContentCity', () => {
  describe('happy path', () => {
    it('writes Rome in 1100 with its place, its reasons and its source’s line joined in', () => {
      expect(toContentCity(rome())).toEqual({
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
      })
    })

    it('writes a city core’s content schema accepts', () => {
      const file = { version: CONTENT_FORMAT_VERSION, events: [], cities: [toContentCity(rome())] }
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
      expect(toContentCity(rome({ testimonies: lines })).testimonies).toEqual([
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
        rome({ testimonies: [line], holderName: 'Republic of Venice', holderQid: 'Q4948' })
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
      const nameOnly = toContentCity(rome({ holderName: 'Norse Greenland', holderQid: '' }))
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
      expect(toContentCity(rome({ testimonies: [line] })).testimonies[0]).toMatchObject({
        holder: { name: 'Norse Greenland', wikidata: null },
      })
    })

    it('writes no holder for a sheet whose holder was emptied in the admin', () => {
      expect(toContentCity(rome({ holderName: '', holderQid: '' })).holder).toBeNull()
    })

    it('writes a city with no reason and no line', () => {
      const city = toContentCity(rome({ reasons: null, testimonies: null }))
      expect([city.reasons, city.testimonies]).toEqual([[], []])
    })
  })

  describe('managed errors', () => {
    it('stops on a sheet the schema refuses, naming it and where', () => {
      const line = { source: BURINGH, subject: 'population' as const, population: null }
      expect(() => toContentCity(rome({ testimonies: [line] }))).toThrow(
        /city sheet 1: refused by the schema: testimonies\.0\.population/
      )
    })

    it('stops on a sheet whose date does not read', () => {
      expect(() => toContentCity(rome({ date: { start: { year: 0 } } }))).toThrow(
        'city sheet 1: its date does not read'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('stops on a place the query did not resolve — the atlas never joins', () => {
      expect(() => toContentCity(rome({ place: 5 }))).toThrow(
        'city sheet 1, place: not resolved (5)'
      )
    })

    it('stops on a reason the query did not resolve', () => {
      expect(() => toContentCity(rome({ reasons: [3] }))).toThrow('not resolved (3)')
    })
  })

  describe('edge cases', () => {
    it('stops on a place with no French name', () => {
      const place = { ...ROME_PLACE, name: { fr: '', en: 'Rome' } }
      expect(() => toContentCity(rome({ place }))).toThrow('place 5: no French text')
    })
  })
})
