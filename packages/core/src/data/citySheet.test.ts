import { describe, expect, it } from 'vitest'

import { checkCitySheet, isSheetRefused } from './citySheet'

/**
 * The fields a sheet was refused on, or the sheet when it was not.
 * @param value - what is checked
 * @returns the fields, in order
 */
function refusedFields(value: unknown): string[] | 'accepted' {
  const answer = checkCitySheet(value)
  return isSheetRefused(answer) ? answer.map((issue) => issue.field) : 'accepted'
}

/** Rome in 1100, a capital — the sheet the dev's base holds. */
const rome = {
  place: 3,
  date: {
    kind: 'instant',
    at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
  },
  importance: 'capital',
}

describe('checkCitySheet', () => {
  describe('happy path', () => {
    it('reads a place, a year and an importance as a sheet', () => {
      expect(checkCitySheet(rome)).toEqual(rome)
    })
  })

  describe('variants', () => {
    it('takes a place id written as text, as another base would give it', () => {
      expect(checkCitySheet({ ...rome, place: '64f0c2' })).toEqual({ ...rome, place: '64f0c2' })
    })

    it('ignores a document’s other fields — its id, its timestamps', () => {
      expect(checkCitySheet({ ...rome, id: 7, createdAt: '2026-10-30' })).toEqual(rome)
    })

    it('reads an interval', () => {
      const span = {
        kind: 'interval',
        from: rome.date.at,
        to: { ...rome.date.at, year: 1130 },
      }
      expect(checkCitySheet({ ...rome, date: span })).toEqual({ ...rome, date: span })
    })
  })

  describe('managed errors', () => {
    it('names every missing field at once, so a form shows each under its own', () => {
      const answer = checkCitySheet({})
      expect(isSheetRefused(answer)).toBe(true)
      expect(isSheetRefused(answer) && answer.map((issue) => issue.field)).toEqual([
        'place',
        'date',
        'importance',
      ])
    })

    it('refuses an importance the map does not have', () => {
      expect(refusedFields({ ...rome, importance: 'village' })).toEqual(['importance'])
    })

    it('refuses the date by the date’s own rules — the year 0', () => {
      const answer = checkCitySheet({
        ...rome,
        date: { ...rome.date, at: { ...rome.date.at, year: 0 } },
      })
      expect(isSheetRefused(answer) && answer.map((issue) => issue.field)).toEqual(['date'])
      expect(isSheetRefused(answer) && answer[0]?.detail).toContain('no year 0')
    })
  })

  describe('unmanaged errors', () => {
    it('refuses what is not an object, on no field — said, never shown under a field', () => {
      expect(() => checkCitySheet(null)).toThrow("a city sheet's issue names no field")
    })
  })

  describe('edge cases', () => {
    it('refuses an empty place id', () => {
      expect(refusedFields({ ...rome, place: '' })).toEqual(['place'])
    })

    it('refuses a fractional place id', () => {
      expect(refusedFields({ ...rome, place: 3.5 })).toEqual(['place'])
    })
  })
})
