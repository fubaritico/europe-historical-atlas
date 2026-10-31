import { describe, expect, it } from 'vitest'

import { sheetTitle } from './sheetTitle'

import type { MomentFields } from './historicalDate'

/**
 * One end of a date as the form stores it.
 * @param year - the year
 * @param circa - « vers »
 * @returns the group
 */
function end(year: number, circa = false): MomentFields {
  return { year, month: null, day: null, circa, margin: null, calendar: null }
}

describe('sheetTitle', () => {
  describe('happy path', () => {
    it('writes the place and a year as « Paris — 1100 »', () => {
      expect(sheetTitle('Paris', { start: end(1100) })).toBe('Paris — 1100')
    })
  })

  describe('variants', () => {
    it('writes a span as « Paris — 1100–1150 »', () => {
      expect(sheetTitle('Paris', { start: end(1100), end: end(1150) })).toBe('Paris — 1100–1150')
    })

    it('writes « vers » before an approximate year', () => {
      expect(sheetTitle('Paris', { start: end(1100, true) })).toBe('Paris — vers 1100')
    })

    it('writes a month with its year', () => {
      expect(sheetTitle('Jérusalem', { start: { ...end(1099), month: 7 } })).toBe(
        'Jérusalem — juillet 1099'
      )
    })
  })

  describe('managed errors', () => {
    it('gives no title to a date without a start, left to the date’s own rule', () => {
      expect(sheetTitle('Paris', {})).toBeNull()
    })

    it('gives no title to a span ending before it starts', () => {
      expect(sheetTitle('Paris', { start: end(1150), end: end(1100) })).toBeNull()
    })
  })

  // L4: N/A — a pure function over values already read; no I/O.

  describe('edge cases', () => {
    it('writes a year before Christ the way core writes it', () => {
      expect(sheetTitle('Athènes', { start: end(-500) })).toBe('Athènes — 500 av. J.-C.')
    })
  })
})
