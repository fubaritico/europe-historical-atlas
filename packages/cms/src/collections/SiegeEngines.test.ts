import { describe, expect, it } from 'vitest'

import { SIEGE_ENGINES } from '@europe-historical-atlas/core/data/siegeEngines'

import { eventDateField } from '../fields/historicalDate'

import { SiegeEngines } from './SiegeEngines'

import type { MomentFields } from '../fields/historicalDate'
import type { Field } from 'payload'

/** The validation a year field runs, as Payload calls it. */
type YearValidate = (
  value: unknown,
  options: { siblingData: MomentFields; data: Record<string, unknown> }
) => true | string

/**
 * A named field among a list, looking through rows, as the form nests them.
 * @param fields - the list
 * @param name - the field's name
 * @returns the field, or `null` when the list lacks it
 */
function findField(fields: readonly Field[], name: string): Field | null {
  for (const field of fields) {
    if ('name' in field && field.name === name) return field
    const inRow = field.type === 'row' ? findField(field.fields, name) : null
    if (inRow !== null) return inRow
  }
  return null
}

/**
 * {@link findField}, for a field the test needs.
 * @param fields - the list
 * @param name - the field's name
 * @returns the field
 * @throws when it is missing — the test is about a field that should be there
 */
function requireField(fields: readonly Field[], name: string): Field {
  const field = findField(fields, name)
  if (field === null) throw new Error(`no field ${name}`)
  return field
}

/**
 * The validation of a date's end year: `<date>.end.year`.
 * @param date - the date's group field
 * @returns its validation
 */
function endYearValidate(date: Field): YearValidate {
  if (date.type !== 'group') throw new Error('not a group')
  const end = requireField(date.fields, 'end')
  if (end.type !== 'group') throw new Error('no end group')
  const year = requireField(end.fields, 'year')
  if (year.type !== 'number' || year.validate === undefined) throw new Error('no year validation')
  return year.validate as unknown as YearValidate
}

describe('SiegeEngines', () => {
  describe('happy path', () => {
    it('offers exactly the engins the atlas can draw', () => {
      const engine = requireField(SiegeEngines.fields, 'engine')
      expect(
        engine.type === 'select' &&
          engine.options.map((option) => (option as { value: string }).value)
      ).toEqual([...SIEGE_ENGINES])
    })
  })

  describe('variants', () => {
    it('accepts a period whose end comes after its beginning', () => {
      const validate = endYearValidate(requireField(SiegeEngines.fields, 'inUse'))
      const data = { inUse: { start: { year: 1217 } } }
      expect(validate(1450, { siblingData: { year: 1450 }, data })).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('refuses a period that ends before it begins, read under its own name', () => {
      const validate = endYearValidate(requireField(SiegeEngines.fields, 'inUse'))
      const data = { inUse: { start: { year: 1217 } } }
      expect(validate(1100, { siblingData: { year: 1100 }, data })).toBe(
        'La fin vient avant le début.'
      )
    })

    it('cannot be saved without a source', () => {
      const sources = requireField(SiegeEngines.fields, 'sources')
      expect(sources).toMatchObject({
        type: 'relationship',
        relationTo: 'sources',
        hasMany: true,
        required: true,
      })
    })
  })

  // L4: N/A — a configuration, no I/O; Payload runs the validations shown above.

  describe('edge cases', () => {
    it('still checks an event’s end against the event’s own beginning, as before the date field was shared', () => {
      const validate = endYearValidate(eventDateField)
      const data = { date: { start: { year: 1099 } } }
      expect(validate(1098, { siblingData: { year: 1098 }, data })).toBe(
        'La fin vient avant le début.'
      )
    })

    it('needs no end: an engin with none is still in use', () => {
      const validate = endYearValidate(requireField(SiegeEngines.fields, 'inUse'))
      expect(validate(null, { siblingData: {}, data: { inUse: { start: { year: 1326 } } } })).toBe(
        true
      )
    })
  })
})
