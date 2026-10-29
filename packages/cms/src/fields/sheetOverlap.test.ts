import { describe, expect, it } from 'vitest'

import { overlappingSheet } from './sheetOverlap'

import type { EventDateFields } from './historicalDate'
import type { SavedSheet } from './sheetOverlap'

/** A date as the form holds it: a year, and an end year for a span. */
function date(start: number, end?: number): EventDateFields {
  return end === undefined
    ? { start: { year: start } }
    : { start: { year: start }, end: { year: end } }
}

/** A saved sheet. */
function sheet(id: number, start: number, end?: number): SavedSheet {
  return { id, date: date(start, end) }
}

describe('sheetOverlap', () => {
  describe('happy path', () => {
    it('names the saved sheet of the same year', () => {
      const saved = [sheet(1, 1100)]
      expect(overlappingSheet(date(1100), saved)?.sheet).toBe(saved[0])
    })

    it('finds nothing when the place has no sheet that year', () => {
      expect(overlappingSheet(date(1100), [sheet(1, 1200)])).toBeNull()
    })
  })

  describe('variants', () => {
    it('refuses a year inside a saved span', () => {
      expect(overlappingSheet(date(1100), [sheet(1, 1050, 1150)])?.sheet.id).toBe(1)
    })

    it('refuses a span over a saved year', () => {
      expect(overlappingSheet(date(1050, 1150), [sheet(1, 1100)])?.sheet.id).toBe(1)
    })

    it('hands back the saved date read, for the message to write it', () => {
      const overlap = overlappingSheet(date(1100), [sheet(1, 1050, 1150)])
      expect(overlap?.date.kind).toBe('interval')
    })

    it('does not compare a sheet being edited with itself', () => {
      expect(overlappingSheet(date(1100), [sheet(7, 1100)], 7)).toBeNull()
    })

    it('still compares an edited sheet with the place’s other sheets', () => {
      expect(overlappingSheet(date(1100), [sheet(7, 1100), sheet(8, 1100)], 7)?.sheet.id).toBe(8)
    })

    it('matches the edited sheet’s id whether it arrives as a number or a string', () => {
      expect(overlappingSheet(date(1100), [sheet(7, 1100)], '7')).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('finds nothing while the date has no year yet: its own field says so', () => {
      expect(overlappingSheet({ start: {} }, [sheet(1, 1100)])).toBeNull()
    })

    it('finds nothing for a date its own field refuses, the year 0', () => {
      expect(overlappingSheet(date(0), [sheet(1, 1100)])).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('throws on a saved sheet whose date does not read, rather than letting a second one in over it', () => {
      expect(() => overlappingSheet(date(1100), [{ id: 3, date: { start: { year: 0 } } }])).toThrow(
        /city-at-a-date 3 holds an unreadable date/
      )
    })
  })

  describe('edge cases', () => {
    it('refuses a year on the last year of a saved span', () => {
      expect(overlappingSheet(date(1150), [sheet(1, 1050, 1150)])).not.toBeNull()
    })

    it('accepts the year right after a saved span', () => {
      expect(overlappingSheet(date(1151), [sheet(1, 1050, 1150)])).toBeNull()
    })

    it('accepts a first sheet: nothing saved yet', () => {
      expect(overlappingSheet(date(1100), [])).toBeNull()
    })
  })
})
