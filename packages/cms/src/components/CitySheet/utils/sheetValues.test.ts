import { describe, expect, it } from 'vitest'

import { EMPTY_MOMENT, momentValues, readNumber, sheetBody, sheetValues } from './sheetValues'

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
      expect(sheetValues(saved, 'Rome')).toEqual({
        place: { id: 5, name: 'Rome' },
        date: { start: { ...EMPTY_MOMENT, year: '1100' }, end: EMPTY_MOMENT },
        importance: 'capital',
      })
    })

    it('sends back what it read, to the field', () => {
      expect(sheetBody(sheetValues(saved, 'Rome'))).toEqual({
        place: 5,
        date: {
          start: saved.date.start,
          end: { ...saved.date.end, circa: false, calendar: 'julian' },
        },
        importance: 'capital',
      })
    })
  })

  describe('variants', () => {
    it('reads a populated place by its id', () => {
      expect(sheetValues({ ...saved, place: { id: 5, name: 'Rome' } }, 'Rome').place).toEqual({
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
  })

  describe('managed errors', () => {
    it('starts a new sheet empty', () => {
      expect(sheetValues({}, null)).toEqual({
        place: null,
        date: { start: EMPTY_MOMENT, end: EMPTY_MOMENT },
        importance: '',
      })
    })

    it('sends no place and no importance as null, for the server to refuse', () => {
      expect(sheetBody(sheetValues({}, null))).toMatchObject({ place: null, importance: null })
    })
  })

  describe('unmanaged errors', () => {
    it('shows no place when its name could not be read', () => {
      expect(sheetValues(saved, null).place).toBeNull()
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
