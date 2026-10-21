import { describe, expect, it } from 'vitest'

import { astronomicalYear, daysInMonth, historicalYear, isLeapYear } from './calendar'

describe('calendar', () => {
  describe('happy path', () => {
    it('reads 1100 as a leap year in the Julian calendar and a common one in the Gregorian', () => {
      expect(isLeapYear(1100, 'julian')).toBe(true)
      expect(isLeapYear(1100, 'gregorian')).toBe(false)
    })

    it('gives February 29 days in a leap year and 28 otherwise', () => {
      expect(daysInMonth(1100, 2, 'julian')).toBe(29)
      expect(daysInMonth(1100, 2, 'gregorian')).toBe(28)
    })
  })

  describe('variants', () => {
    it('reads 1600 as a leap year in both calendars — a century divisible by 400', () => {
      expect(isLeapYear(1600, 'julian')).toBe(true)
      expect(isLeapYear(1600, 'gregorian')).toBe(true)
    })

    it('reads 1066 as a common year in both calendars', () => {
      expect(isLeapYear(1066, 'julian')).toBe(false)
      expect(isLeapYear(1066, 'gregorian')).toBe(false)
    })

    it.each([
      [1, 31],
      [4, 30],
      [7, 31],
      [9, 30],
      [12, 31],
    ])('gives month %i of 1066 its %i days', (month, days) => {
      expect(daysInMonth(1066, month, 'julian')).toBe(days)
    })

    it('maps 1 BC to the astronomers’ year 0 and AD 1 to 1, and back', () => {
      expect(astronomicalYear(-1)).toBe(0)
      expect(astronomicalYear(1)).toBe(1)
      expect(historicalYear(0)).toBe(-1)
      expect(historicalYear(1)).toBe(1)
    })
  })

  // L3 (managed errors): N/A — the calendar refuses nothing a caller reaches legitimately; the reader
  // does (historicalDate.test.ts). Vitest fails on an empty suite, hence a note, not a block.

  describe('unmanaged errors', () => {
    it('throws on a month of 13 rather than guessing a length', () => {
      expect(() => daysInMonth(1066, 13, 'julian')).toThrow(RangeError)
    })
  })

  describe('edge cases', () => {
    // 45 BC is the astronomers' -44: a leap year. Counting on the historical -45 says it is not.
    it('reads 45 BC as a Julian leap year, counting on the astronomers’ year', () => {
      expect(isLeapYear(-45, 'julian')).toBe(true)
      expect(isLeapYear(-44, 'julian')).toBe(false)
    })

    it('maps 2 BC to the astronomers’ year -1, and back', () => {
      expect(astronomicalYear(-2)).toBe(-1)
      expect(historicalYear(-1)).toBe(-2)
    })
  })
})
