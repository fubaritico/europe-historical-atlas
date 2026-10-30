import { describe, expect, it } from 'vitest'

import {
  EMPTY_MOMENT,
  emptyTestimony,
  momentValues,
  readNumber,
  sheetBody,
  sheetValues,
  testimonyBody,
} from './sheetValues'

/** Rome's sheet as Payload hands it to the view. */
const saved = {
  id: 1,
  place: 5,
  date: {
    start: { year: 1100, month: null, day: null, circa: false, margin: null, calendar: 'julian' },
    end: { year: null, month: null, day: null, circa: null, margin: null, calendar: null },
  },
  importance: 'capital',
}

describe('sheetValues', () => {
  describe('happy path', () => {
    it('reads a saved sheet into the form, its place named', () => {
      expect(sheetValues(saved, 'Rome', new Map())).toEqual({
        place: { id: 5, name: 'Rome' },
        date: { start: { ...EMPTY_MOMENT, year: '1100' }, end: EMPTY_MOMENT },
        importance: 'capital',
        reasons: [],
        testimonies: [],
      })
    })

    it('sends back what it read, to the field', () => {
      expect(sheetBody(sheetValues(saved, 'Rome', new Map()))).toEqual({
        place: 5,
        date: {
          start: saved.date.start,
          end: { ...saved.date.end, circa: false, calendar: 'julian' },
        },
        importance: 'capital',
        reasons: [],
        testimonies: [],
      })
    })
  })

  describe('variants', () => {
    it('reads a populated place by its id', () => {
      expect(
        sheetValues({ ...saved, place: { id: 5, name: 'Rome' } }, 'Rome', new Map()).place
      ).toEqual({
        id: 5,
        name: 'Rome',
      })
    })

    it('reads every part of an end', () => {
      expect(
        momentValues({ year: -50, month: 3, day: 15, circa: true, margin: 2, calendar: 'julian' })
      ).toEqual({
        year: '-50',
        month: '3',
        day: '15',
        circa: true,
        margin: '2',
        calendar: 'julian',
      })
    })

    it('reads the reasons and a saved line — its row id, its source named, its value — and sends them back', () => {
      const row = {
        id: 'r1',
        source: 4,
        subject: 'population',
        population: 35000,
        importance: null,
        reason: null,
        where: 'p. 12',
      }
      const values = sheetValues(
        { ...saved, reasons: [1, { id: 2 }], testimonies: [row] },
        'Rome',
        new Map([['4', 'Buringh 2021']])
      )
      expect(values.reasons).toEqual([1, 2])
      expect(values.testimonies).toEqual([
        {
          key: 'r1',
          rowId: 'r1',
          source: { id: 4, name: 'Buringh 2021' },
          subject: 'population',
          population: '35000',
          importance: '',
          reason: null,
          where: 'p. 12',
        },
      ])
      expect(sheetBody(values).testimonies).toEqual([row])
    })

    it('sends only the value a line’s subject names, the others null', () => {
      const line = {
        ...emptyTestimony(),
        subject: 'reason' as const,
        population: '12',
        reason: 2,
        where: ' ',
      }
      expect(testimonyBody(line)).toMatchObject({
        population: null,
        importance: null,
        reason: 2,
        where: null,
      })
    })
  })

  describe('managed errors', () => {
    it('starts a new sheet empty', () => {
      expect(sheetValues({}, null, new Map())).toEqual({
        place: null,
        date: { start: EMPTY_MOMENT, end: EMPTY_MOMENT },
        importance: '',
        reasons: [],
        testimonies: [],
      })
    })

    it('sends no place and no importance as null, for the server to refuse', () => {
      expect(sheetBody(sheetValues({}, null, new Map()))).toMatchObject({
        place: null,
        importance: null,
      })
    })
  })

  describe('unmanaged errors', () => {
    it('shows no place when its name could not be read', () => {
      expect(sheetValues(saved, null, new Map()).place).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('reads an empty input as no value, and keeps a fraction for the rules to refuse', () => {
      expect(readNumber('')).toBeNull()
      expect(readNumber('  ')).toBeNull()
      expect(readNumber('1100.5')).toBe(1100.5)
    })
  })
})
