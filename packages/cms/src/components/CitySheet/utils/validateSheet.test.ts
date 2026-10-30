import { describe, expect, it, vi } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { describeDateRefusalFr } from '../../../fields/historicalDate'
import { CITY_SHEET_MESSAGES } from '../i18n'

import { EMPTY_MOMENT } from './sheetValues'
import { validateSheet } from './validateSheet'

import type { MomentValues, SheetValues } from './sheetValues'

/** The French texts, as the form says them. */
const say = createTranslator(CITY_SHEET_MESSAGES, 'fr')

/** Rome in 1100, a capital: valid. */
const rome: SheetValues = {
  place: { id: 5, name: 'Rome' },
  date: { start: { ...EMPTY_MOMENT, year: '1100' }, end: EMPTY_MOMENT },
  importance: 'capital',
}

/**
 * Rome with one end changed.
 * @param end - which end
 * @param values - its values over the empty end
 * @returns the sheet
 */
function withMoment(end: 'start' | 'end', values: Partial<MomentValues>): SheetValues {
  const start = end === 'start' ? { ...EMPTY_MOMENT, ...values } : rome.date.start
  return {
    ...rome,
    date: { start, end: end === 'end' ? { ...EMPTY_MOMENT, ...values } : EMPTY_MOMENT },
  }
}

describe('validateSheet', () => {
  describe('happy path', () => {
    it('finds nothing wrong with Rome in 1100, a capital', () => {
      expect(validateSheet(rome, say)).toEqual({})
    })
  })

  describe('variants', () => {
    it('takes a span, a circa year with its margin, a 29 February of a Julian leap year', () => {
      const span: SheetValues = {
        ...rome,
        date: {
          start: { ...EMPTY_MOMENT, year: '1100', circa: true, margin: '5' },
          end: { ...EMPTY_MOMENT, year: '1132', month: '2', day: '29', calendar: 'julian' },
        },
      }
      expect(validateSheet(span, say)).toEqual({})
    })

    it('takes a year before Christ', () => {
      expect(validateSheet(withMoment('start', { year: '-50' }), say)).toEqual({})
    })
  })

  describe('managed errors', () => {
    it('names every missing field of a new sheet, each under its own', () => {
      const empty: SheetValues = {
        place: null,
        date: { start: EMPTY_MOMENT, end: EMPTY_MOMENT },
        importance: '',
      }
      expect(validateSheet(empty, say)).toEqual({
        place: 'Choisissez un lieu.',
        date: { start: { year: 'Il faut au moins une année.' } },
        importance: 'Choisissez une importance.',
      })
    })

    it('puts each refusal of the date under the field that would change it', () => {
      expect(validateSheet(withMoment('start', { year: '0' }), say)).toEqual({
        date: { start: { year: say('yearZero') } },
      })
      expect(validateSheet(withMoment('start', { year: '1100', day: '3' }), say)).toEqual({
        date: { start: { month: say('dayWithoutMonth') } },
      })
      expect(validateSheet(withMoment('start', { year: '1100', margin: '5' }), say)).toEqual({
        date: { start: { margin: say('marginWithoutCirca') } },
      })
      expect(
        validateSheet(withMoment('start', { year: '1100', month: '2', day: '30' }), say)
      ).toEqual({ date: { start: { day: say('noSuchDay') } } })
    })

    it('puts an end before its start under the end’s year', () => {
      expect(validateSheet(withMoment('end', { year: '1050' }), say)).toEqual({
        date: { end: { year: say('reversed') } },
      })
    })

    it('says a number out of its bounds under its field, before reading the date', () => {
      expect(validateSheet(withMoment('start', { year: '1100', month: '13' }), say)).toEqual({
        date: { start: { month: say('monthRange') } },
      })
      expect(validateSheet(withMoment('start', { year: '1100', day: '0' }), say)).toEqual({
        date: { start: { day: say('dayRange') } },
      })
      expect(
        validateSheet(withMoment('start', { year: '1100', circa: true, margin: '0' }), say)
      ).toEqual({ date: { start: { margin: say('marginRange') } } })
    })
    // Payload's own field validators say the same refusals at save (`describeDateRefusalFr`): one wording, both ways.
    it('says each refusal of the date in the very words the server says it', () => {
      const pairs = [
        [say('yearMissing'), describeDateRefusalFr({ kind: 'shape', detail: 'start.year' })],
        [say('yearZero'), describeDateRefusalFr({ kind: 'year-zero', end: 'at' })],
        [say('dayWithoutMonth'), describeDateRefusalFr({ kind: 'day-without-month', end: 'at' })],
        [
          say('dayWithoutCalendar'),
          describeDateRefusalFr({ kind: 'day-without-calendar', end: 'at' }),
        ],
        [
          say('calendarWithoutDay'),
          describeDateRefusalFr({ kind: 'calendar-without-day', end: 'at' }),
        ],
        [say('noSuchDay'), describeDateRefusalFr({ kind: 'no-such-day', end: 'at' })],
        [
          say('marginWithoutCirca'),
          describeDateRefusalFr({ kind: 'margin-without-circa', end: 'at' }),
        ],
        [say('reversed'), describeDateRefusalFr({ kind: 'reversed' })],
      ]
      for (const [ours, theirs] of pairs) expect(ours).toBe(theirs)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a fraction rather than rounding it', () => {
      expect(validateSheet(withMoment('start', { year: '1100.5' }), say)).toEqual({
        date: { start: { year: say('wholeNumber') } },
      })
    })

    it('says nothing of the console on a valid sheet', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      validateSheet(rome, say)
      expect(error).not.toHaveBeenCalled()
      error.mockRestore()
    })
  })

  describe('edge cases', () => {
    it('ignores an end with no year, whatever else it holds', () => {
      expect(validateSheet(withMoment('end', { month: '3' }), say)).toEqual({})
    })

    it('reads a year typed with spaces around it', () => {
      expect(validateSheet(withMoment('start', { year: ' 1100 ' }), say)).toEqual({})
    })
  })
})
