import { describe, expect, it, vi } from 'vitest'

import { describeDateRefusal, isAfter, isDateRefusal, readHistoricalDate } from './historicalDate'

import type { HistoricalMoment } from './historicalDate'

/** A moment, a year by default. */
function moment(fields: Partial<HistoricalMoment> = {}): HistoricalMoment {
  return { year: 1100, month: null, day: null, calendar: null, circa: false, ...fields }
}

/** Read with a silent, observable warn. */
function read(value: unknown) {
  const warn = vi.fn()
  return { answer: readHistoricalDate(value, warn), warn }
}

describe('historicalDate', () => {
  describe('happy path', () => {
    it('reads a year as an instant', () => {
      const date = { kind: 'instant', at: moment() }
      expect(read(date).answer).toEqual(date)
    })

    it('reads 1337–1453 as an interval', () => {
      const date = { kind: 'interval', from: moment({ year: 1337 }), to: moment({ year: 1453 }) }
      expect(read(date).answer).toEqual(date)
    })

    it('says nothing when the date is read', () => {
      const { warn } = read({ kind: 'instant', at: moment() })
      expect(warn).not.toHaveBeenCalled()
    })
  })

  describe('variants', () => {
    it('reads a Julian day: 14 October 1066', () => {
      const at = moment({ year: 1066, month: 10, day: 14, calendar: 'julian' })
      expect(read({ kind: 'instant', at }).answer).toEqual({ kind: 'instant', at })
    })

    it('reads a month without a day', () => {
      const at = moment({ month: 3 })
      expect(read({ kind: 'instant', at }).answer).toEqual({ kind: 'instant', at })
    })

    it('reads circa 1100', () => {
      const at = moment({ circa: true })
      expect(read({ kind: 'instant', at }).answer).toEqual({ kind: 'instant', at })
    })

    it('reads 44 BC', () => {
      const at = moment({ year: -44 })
      expect(read({ kind: 'instant', at }).answer).toEqual({ kind: 'instant', at })
    })

    it('reads an interval of one single year', () => {
      const date = { kind: 'interval', from: moment(), to: moment() }
      expect(read(date).answer).toEqual(date)
    })
  })

  describe('managed errors', () => {
    it('refuses the year 0, naming the end', () => {
      expect(read({ kind: 'instant', at: moment({ year: 0 }) }).answer).toEqual({
        kind: 'year-zero',
        end: 'at',
      })
    })

    it('refuses a day with no month', () => {
      const at = moment({ day: 14, calendar: 'julian' })
      expect(read({ kind: 'instant', at }).answer).toEqual({ kind: 'day-without-month', end: 'at' })
    })

    it('refuses a day with no calendar', () => {
      const at = moment({ year: 1066, month: 10, day: 14 })
      expect(read({ kind: 'instant', at }).answer).toEqual({
        kind: 'day-without-calendar',
        end: 'at',
      })
    })

    it('refuses a calendar with no day', () => {
      const at = moment({ month: 10, calendar: 'julian' })
      expect(read({ kind: 'instant', at }).answer).toEqual({
        kind: 'calendar-without-day',
        end: 'at',
      })
    })

    it('refuses 30 February', () => {
      const at = moment({ month: 2, day: 30, calendar: 'julian' })
      expect(read({ kind: 'instant', at }).answer).toEqual({ kind: 'no-such-day', end: 'at' })
    })

    it('refuses 1453–1337 as reversed', () => {
      const date = { kind: 'interval', from: moment({ year: 1453 }), to: moment({ year: 1337 }) }
      expect(read(date).answer).toEqual({ kind: 'reversed' })
    })

    it('names the end of an interval that is refused', () => {
      const date = { kind: 'interval', from: moment(), to: moment({ year: 0 }) }
      expect(read(date).answer).toEqual({ kind: 'year-zero', end: 'to' })
    })

    it('says the refusal once, with its reason', () => {
      const { warn } = read({ kind: 'instant', at: moment({ year: 0 }) })
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(
        'Historical date refused: at: there is no year 0 — 1 BC is followed by AD 1'
      )
    })

    it.each([
      [{ kind: 'shape', detail: 'at.month: too big' }, 'not a date — at.month: too big'],
      [{ kind: 'year-zero', end: 'to' }, 'to: there is no year 0 — 1 BC is followed by AD 1'],
      [{ kind: 'day-without-month', end: 'at' }, 'at: a day needs its month'],
      [
        { kind: 'day-without-calendar', end: 'at' },
        'at: a day needs its calendar, Julian or Gregorian',
      ],
      [{ kind: 'calendar-without-day', end: 'at' }, 'at: a calendar only matters for a day'],
      [{ kind: 'no-such-day', end: 'from' }, 'from: that month has no such day that year'],
      [{ kind: 'reversed' }, 'the interval ends before it begins'],
    ] as const)('words the refusal %o as “%s”', (refusal, sentence) => {
      expect(describeDateRefusal(refusal)).toBe(sentence)
    })
  })

  describe('unmanaged errors', () => {
    it.each([
      ['nothing', undefined],
      ['a bare year', 1100],
      ['a string', '1100'],
      ['an unknown kind', { kind: 'era', at: moment() }],
    ])('refuses %s as not a date', (_, value) => {
      const answer = read(value).answer
      expect(isDateRefusal(answer) && answer.kind).toBe('shape')
    })

    it('names the field of a month of 13', () => {
      const answer = read({ kind: 'instant', at: moment({ month: 13 }) }).answer
      expect(isDateRefusal(answer) && answer.kind === 'shape' && answer.detail).toMatch(
        /^at\.month: /
      )
    })

    it('refuses an unknown key rather than dropping it', () => {
      const answer = read({ kind: 'instant', at: { ...moment(), approximate: true } }).answer
      expect(isDateRefusal(answer) && answer.kind).toBe('shape')
    })

    it('refuses a fractional year', () => {
      const answer = read({ kind: 'instant', at: moment({ year: 1100.5 }) }).answer
      expect(isDateRefusal(answer) && answer.kind).toBe('shape')
    })
  })

  describe('edge cases', () => {
    // 1100 is a leap year for the Julian calendar only.
    it('accepts 29 February 1100 Julian and refuses it Gregorian', () => {
      const julian = moment({ month: 2, day: 29, calendar: 'julian' })
      const gregorian = moment({ month: 2, day: 29, calendar: 'gregorian' })
      expect(isDateRefusal(read({ kind: 'instant', at: julian }).answer)).toBe(false)
      expect(read({ kind: 'instant', at: gregorian }).answer).toEqual({
        kind: 'no-such-day',
        end: 'at',
      })
    })

    // 14 October Julian is 20 October Gregorian: comparing the numbers as written calls this reversed.
    it('orders two days across calendars by the day, not by the numbers written', () => {
      const date = {
        kind: 'interval',
        from: moment({ year: 1066, month: 10, day: 18, calendar: 'gregorian' }),
        to: moment({ year: 1066, month: 10, day: 14, calendar: 'julian' }),
      }
      expect(read(date).answer).toEqual(date)
    })

    it('does not call a year after a month of that same year', () => {
      expect(isAfter(moment(), moment({ month: 3 }))).toBe(false)
      expect(isAfter(moment({ month: 3 }), moment())).toBe(false)
    })

    it('orders two months of one year', () => {
      expect(isAfter(moment({ month: 4 }), moment({ month: 3 }))).toBe(true)
    })

    it('orders 44 BC before AD 1', () => {
      expect(isAfter(moment({ year: -44 }), moment({ year: 1 }))).toBe(false)
      expect(isAfter(moment({ year: 1 }), moment({ year: -44 }))).toBe(true)
    })
  })
})
