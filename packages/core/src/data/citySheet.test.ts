import { describe, expect, it } from 'vitest'

import { checkCitySheet, isSheetRefused } from './citySheet'

/**
 * The paths a sheet was refused on, or `accepted`.
 * @param value - what is checked
 * @returns the paths, dot-joined, in order
 */
function refusedPaths(value: unknown): string[] | 'accepted' {
  const answer = checkCitySheet(value)
  return isSheetRefused(answer) ? answer.map((issue) => issue.path.join('.')) : 'accepted'
}

/** Rome in 1100, a capital, a seat of power, Buringh's figure — the kind of sheet the dev enters. */
const rome = {
  place: 3,
  date: {
    kind: 'instant',
    at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
  },
  importance: 'capital',
  reasons: [1],
  testimonies: [{ source: 4, subject: 'population', population: 35000, where: 'p. 12' }],
}

describe('checkCitySheet', () => {
  describe('happy path', () => {
    it('reads a place, a year, an importance, its reasons and a source’s line as a sheet', () => {
      expect(checkCitySheet(rome)).toEqual(rome)
    })
  })

  describe('variants', () => {
    it('takes a place id written as text, as another base would give it', () => {
      expect(checkCitySheet({ ...rome, place: '64f0c2' })).toEqual({ ...rome, place: '64f0c2' })
    })

    it('ignores a document’s other fields — its id, its timestamps, a line’s row id and empty values', () => {
      const line = {
        id: 'a1',
        source: 4,
        subject: 'reason',
        reason: 2,
        population: null,
        importance: null,
        where: null,
      }
      expect(
        checkCitySheet({ ...rome, id: 7, createdAt: '2026-10-30', testimonies: [line] })
      ).toEqual({
        ...rome,
        testimonies: [{ source: 4, subject: 'reason', reason: 2, where: null }],
      })
    })

    it('reads an interval, no reason and no line', () => {
      const span = { kind: 'interval', from: rome.date.at, to: { ...rome.date.at, year: 1130 } }
      const sheet = { ...rome, date: span, reasons: [], testimonies: [] }
      expect(checkCitySheet(sheet)).toEqual(sheet)
    })

    it('reads a line about the importance', () => {
      const line = { source: 4, subject: 'importance', importance: 'large-city' }
      expect(refusedPaths({ ...rome, testimonies: [line] })).toBe('accepted')
    })
  })

  describe('managed errors', () => {
    it('names every missing field at once, so a form shows each under its own', () => {
      expect(refusedPaths({})).toEqual(['place', 'date', 'importance', 'reasons', 'testimonies'])
    })

    it('refuses an importance the map does not have', () => {
      expect(refusedPaths({ ...rome, importance: 'village' })).toEqual(['importance'])
    })

    it('refuses the date by the date’s own rules — the year 0', () => {
      const answer = checkCitySheet({
        ...rome,
        date: { ...rome.date, at: { ...rome.date.at, year: 0 } },
      })
      expect(isSheetRefused(answer) && answer.map((issue) => issue.field)).toEqual(['date'])
      expect(isSheetRefused(answer) && answer[0]?.detail).toContain('no year 0')
    })

    it('refuses a line about the population without its figure, under the figure', () => {
      const line = { source: 4, subject: 'population', population: null }
      expect(refusedPaths({ ...rome, testimonies: [line] })).toEqual(['testimonies.0.population'])
    })

    it('refuses a line without its source, under the source', () => {
      const line = { subject: 'reason', reason: 2 }
      expect(refusedPaths({ ...rome, testimonies: [line] })).toEqual(['testimonies.0.source'])
    })

    it('refuses a line that says nothing of what it speaks about, under the subject', () => {
      expect(refusedPaths({ ...rome, testimonies: [{ source: 4 }] })).toEqual([
        'testimonies.0.subject',
      ])
    })
  })

  describe('unmanaged errors', () => {
    it('refuses what is not an object, on no field — said, never shown under a field', () => {
      expect(() => checkCitySheet(null)).toThrow("a city sheet's issue names no field")
    })
  })

  describe('edge cases', () => {
    it('refuses an empty place id and a fractional one', () => {
      expect(refusedPaths({ ...rome, place: '' })).toEqual(['place'])
      expect(refusedPaths({ ...rome, place: 3.5 })).toEqual(['place'])
    })

    it('refuses a negative population, and takes none at all', () => {
      const line = { source: 4, subject: 'population' }
      expect(refusedPaths({ ...rome, testimonies: [{ ...line, population: -1 }] })).toEqual([
        'testimonies.0.population',
      ])
      expect(refusedPaths({ ...rome, testimonies: [{ ...line, population: 0 }] })).toBe('accepted')
    })

    it('names the line by its rank among several', () => {
      const good = rome.testimonies[0]
      expect(
        refusedPaths({ ...rome, testimonies: [good, { source: 4, subject: 'reason' }] })
      ).toEqual(['testimonies.1.reason'])
    })
  })
})
