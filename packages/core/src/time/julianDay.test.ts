import { describe, expect, it } from 'vitest'

import { calendarDay, convertDay, julianDayNumber } from './julianDay'

describe('julianDay', () => {
  describe('happy path', () => {
    it('converts the Ides of March, 15 March 44 BC Julian, to 13 March 44 BC proleptic Gregorian', () => {
      expect(convertDay({ year: -44, month: 3, day: 15 }, 'julian', 'gregorian')).toEqual({
        year: -44,
        month: 3,
        day: 13,
      })
    })

    it('converts Hastings, 14 October 1066 Julian, to 20 October 1066 Gregorian', () => {
      expect(convertDay({ year: 1066, month: 10, day: 14 }, 'julian', 'gregorian')).toEqual({
        year: 1066,
        month: 10,
        day: 20,
      })
    })
  })

  describe('variants', () => {
    it('numbers 1 January 2000 Gregorian 2 451 545', () => {
      expect(julianDayNumber({ year: 2000, month: 1, day: 1 }, 'gregorian')).toBe(2451545)
    })

    it('numbers 1 January 4713 BC Julian 0 — the count’s origin', () => {
      expect(julianDayNumber({ year: -4713, month: 1, day: 1 }, 'julian')).toBe(0)
      expect(calendarDay(0, 'julian')).toEqual({ year: -4713, month: 1, day: 1 })
    })

    it('makes 4 October 1582 Julian and 15 October 1582 Gregorian two consecutive days — the reform', () => {
      const lastJulian = julianDayNumber({ year: 1582, month: 10, day: 4 }, 'julian')
      const firstGregorian = julianDayNumber({ year: 1582, month: 10, day: 15 }, 'gregorian')
      expect(firstGregorian - lastJulian).toBe(1)
    })

    it('converts 20 October 1066 Gregorian back to 14 October Julian', () => {
      expect(convertDay({ year: 1066, month: 10, day: 20 }, 'gregorian', 'julian')).toEqual({
        year: 1066,
        month: 10,
        day: 14,
      })
    })

    it('returns a copy, unchanged, when both calendars are the same', () => {
      const day = { year: 1100, month: 6, day: 1 }
      const converted = convertDay(day, 'julian', 'julian')
      expect(converted).toEqual(day)
      expect(converted).not.toBe(day)
    })
  })

  // L3 (managed errors): N/A — the reader refuses an impossible day before it is numbered
  // (historicalDate.test.ts). L4 (unmanaged errors): N/A — pure integer arithmetic, no I/O.

  describe('edge cases', () => {
    // From March to August `(month - 9) / 7` is negative: floored, every such day lands a day off.
    it.each([3, 4, 5, 6, 7, 8])(
      'round-trips 1 of month %i, 1066 Julian, to the same day',
      (month) => {
        const day = { year: 1066, month, day: 1 }
        expect(calendarDay(julianDayNumber(day, 'julian'), 'julian')).toEqual(day)
      }
    )

    it('makes 31 December 1 BC and 1 January AD 1 consecutive, with no year 0 between', () => {
      const lastBc = julianDayNumber({ year: -1, month: 12, day: 31 }, 'julian')
      expect(calendarDay(lastBc + 1, 'julian')).toEqual({ year: 1, month: 1, day: 1 })
    })

    it('numbers 29 February 1100 Julian and finds it again', () => {
      const day = { year: 1100, month: 2, day: 29 }
      expect(calendarDay(julianDayNumber(day, 'julian'), 'julian')).toEqual(day)
    })
  })
})
