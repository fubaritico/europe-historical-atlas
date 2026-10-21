import { describe, expect, it } from 'vitest'

import { formatHistoricalDate } from './formatHistoricalDate'

import type { HistoricalDate, HistoricalMoment } from './historicalDate'

/** A moment, a year by default. */
function moment(fields: Partial<HistoricalMoment> = {}): HistoricalMoment {
  return { year: 1100, month: null, day: null, calendar: null, circa: false, ...fields }
}

/** An instant at that moment. */
function instant(fields: Partial<HistoricalMoment> = {}): HistoricalDate {
  return { kind: 'instant', at: moment(fields) }
}

describe('formatHistoricalDate', () => {
  describe('happy path', () => {
    it('writes a year as its number', () => {
      expect(formatHistoricalDate(instant(), 'fr')).toBe('1100')
    })

    it('writes 1337–1453 with a closed en dash', () => {
      const date: HistoricalDate = {
        kind: 'interval',
        from: moment({ year: 1337 }),
        to: moment({ year: 1453 }),
      }
      expect(formatHistoricalDate(date, 'fr')).toBe('1337–1453')
    })
  })

  describe('variants', () => {
    it.each([
      ['fr', 'vers 1100'],
      ['en', 'c. 1100'],
    ] as const)('writes circa 1100 in %s as “%s”', (locale, text) => {
      expect(formatHistoricalDate(instant({ circa: true }), locale)).toBe(text)
    })

    it.each([
      ['fr', '44 av. J.-C.'],
      ['en', '44 BC'],
    ] as const)('writes 44 BC in %s as “%s”', (locale, text) => {
      expect(formatHistoricalDate(instant({ year: -44 }), locale)).toBe(text)
    })

    it.each([
      ['fr', '14 octobre 1066'],
      ['en', '14 October 1066'],
    ] as const)('writes a day in %s as “%s”', (locale, text) => {
      const date = instant({ year: 1066, month: 10, day: 14, calendar: 'julian' })
      expect(formatHistoricalDate(date, locale)).toBe(text)
    })

    it('writes a month without a day', () => {
      expect(formatHistoricalDate(instant({ month: 3 }), 'fr')).toBe('mars 1100')
    })

    it('writes the first of a month “1er” in French', () => {
      const date = instant({ month: 5, day: 1, calendar: 'julian' })
      expect(formatHistoricalDate(date, 'fr')).toBe('1er mai 1100')
      expect(formatHistoricalDate(date, 'en')).toBe('1 May 1100')
    })

    it('spaces the dash when an end has words in it', () => {
      const date: HistoricalDate = {
        kind: 'interval',
        from: moment({ circa: true }),
        to: moment({ year: 1150 }),
      }
      expect(formatHistoricalDate(date, 'fr')).toBe('vers 1100 – 1150')
    })
  })

  // L3 (managed errors): N/A — the formatter writes what the reader accepted; it refuses nothing.

  describe('unmanaged errors', () => {
    it('throws on a month of 13 rather than dropping it from the text', () => {
      expect(() => formatHistoricalDate(instant({ month: 13 }), 'fr')).toThrow(RangeError)
    })

    it('throws on a day with no month rather than dropping it from the text', () => {
      const date = instant({ day: 14, calendar: 'julian' })
      expect(() => formatHistoricalDate(date, 'fr')).toThrow('day 14 has no month')
    })
  })

  describe('edge cases', () => {
    it('writes 1 BC as “1 av. J.-C.”, never as year 0', () => {
      expect(formatHistoricalDate(instant({ year: -1 }), 'fr')).toBe('1 av. J.-C.')
    })

    it('writes an interval across the era with a spaced dash', () => {
      const date: HistoricalDate = {
        kind: 'interval',
        from: moment({ year: -27 }),
        to: moment({ year: 14 }),
      }
      expect(formatHistoricalDate(date, 'en')).toBe('27 BC – 14')
    })
  })
})
