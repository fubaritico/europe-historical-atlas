import { describe, expect, it } from 'vitest'

import {
  describeDateRefusalFr,
  groupAt,
  isMomentRefusal,
  orderRefusal,
  toHistoricalDate,
  toHistoricalMoment,
  validateMoment,
} from './historicalDate'

const AT_1099 = { year: 1099, month: null, day: null, calendar: null, circa: false, margin: null }

describe('historicalDate', () => {
  describe('happy path', () => {
    it('reads an event’s beginning alone as an instant', () => {
      expect(toHistoricalDate({ start: { year: 1099 } })).toEqual({ kind: 'instant', at: AT_1099 })
    })

    it('reads one end of a place’s existence', () => {
      expect(toHistoricalMoment({ year: 1099 })).toEqual(AT_1099)
    })

    it('tells a valid end from a refused one', () => {
      expect(isMomentRefusal(AT_1099)).toBe(false)
      expect(isMomentRefusal({ kind: 'year-zero', end: 'at' })).toBe(true)
    })
  })

  describe('variants', () => {
    it('reads a day with its calendar', () => {
      expect(
        toHistoricalMoment({ year: 1099, month: 7, day: 15, calendar: 'julian' })
      ).toMatchObject({ day: 15, calendar: 'julian' })
    })

    it('drops the calendar when there is no day', () => {
      expect(toHistoricalMoment({ year: 1099, month: 7, calendar: 'julian' })).toMatchObject({
        calendar: null,
      })
    })

    it('reads circa with its margin', () => {
      expect(toHistoricalMoment({ year: -250, circa: true, margin: 50 })).toMatchObject({
        circa: true,
        margin: 50,
      })
    })

    it('reads an event with an end as an interval', () => {
      expect(toHistoricalDate({ start: { year: 1096 }, end: { year: 1099 } })).toMatchObject({
        kind: 'interval',
        from: { year: 1096 },
        to: { year: 1099 },
      })
    })
  })

  describe('managed errors', () => {
    it('reads an end with no year as not given', () => {
      expect(toHistoricalMoment({ year: null, circa: true })).toBeNull()
    })

    it('refuses an event with no beginning', () => {
      expect(toHistoricalDate({})).toEqual({ kind: 'shape', detail: 'start.year' })
    })

    it('refuses the year 0', () => {
      expect(toHistoricalMoment({ year: 0 })).toEqual({ kind: 'year-zero', end: 'at' })
    })

    it('refuses a margin on an exact year', () => {
      expect(toHistoricalMoment({ year: 1100, margin: 5 })).toEqual({
        kind: 'margin-without-circa',
        end: 'at',
      })
    })

    it('refuses an end before the beginning', () => {
      expect(orderRefusal({ year: 1100 }, { year: 1090 })).toEqual({ kind: 'reversed' })
    })
  })

  describe('the form’s validation', () => {
    const own = validateMoment(undefined)
    const end = validateMoment((data) => groupAt(data, 'existsFrom'))

    it('accepts a valid end', () => {
      expect(own(1099, { siblingData: { year: 1099 }, data: {} })).toBe(true)
    })

    it('accepts an end left empty', () => {
      expect(own(null, { siblingData: {}, data: {} })).toBe(true)
    })

    it('shows the refusal of the end itself', () => {
      expect(own(0, { siblingData: { year: 0 }, data: {} })).toBe(
        'L’an 0 n’existe pas : 1 av. J.-C. est suivi de 1 apr. J.-C.'
      )
    })

    it('refuses an end before its beginning, under the end', () => {
      const data = { existsFrom: { year: 1100 } }
      expect(end(1000, { siblingData: { year: 1000 }, data })).toBe('La fin vient avant le début.')
    })

    it('accepts an end after its beginning', () => {
      const data = { existsFrom: { year: -250, circa: true, margin: 50 } }
      expect(end(1100, { siblingData: { year: 1100 }, data })).toBe(true)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a day with no calendar', () => {
      expect(toHistoricalMoment({ year: 1099, month: 7, day: 15, calendar: null })).toEqual({
        kind: 'day-without-calendar',
        end: 'at',
      })
    })
  })

  describe('edge cases', () => {
    it('does not order an end against a missing beginning', () => {
      expect(orderRefusal(undefined, { year: 1090 })).toBeNull()
    })

    it('reads a group nested in the document', () => {
      expect(groupAt({ date: { start: { year: 1 } } }, 'date.start')).toEqual({ year: 1 })
    })

    it('reads a missing group as undefined', () => {
      expect(groupAt({ date: null }, 'date.start')).toBeUndefined()
    })

    it('words every refusal in French', () => {
      expect(describeDateRefusalFr({ kind: 'margin-without-circa', end: 'at' })).toBe(
        'Une marge ne va qu’avec « vers » : une année exacte n’en a pas.'
      )
      expect(describeDateRefusalFr({ kind: 'reversed' })).toBe('La fin vient avant le début.')
    })
  })
})
