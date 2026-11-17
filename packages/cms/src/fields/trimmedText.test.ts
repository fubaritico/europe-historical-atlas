import { describe, expect, it } from 'vitest'

import { Confessions } from '../collections/Confessions'
import { Events } from '../collections/Events'
import { EventTypes } from '../collections/EventTypes'
import { ImportanceReasons } from '../collections/ImportanceReasons'
import { People } from '../collections/People'
import { Places } from '../collections/Places'
import { SiegeEngines } from '../collections/SiegeEngines'
import { Sources } from '../collections/Sources'
import { Territories } from '../collections/Territories'

import { trimmedText } from './trimmedText'

import type { Field } from 'payload'

/**
 * The `beforeValidate` hooks of a named field of a list, looking inside its rows — a row lays fields side by side and
 * adds no level to the record, as the place's name sits in one.
 * @param fields - the list
 * @param name - the field
 * @returns its hooks, empty when it has none
 */
function beforeValidateOf(fields: readonly Field[], name: string): unknown[] {
  for (const field of fields) {
    if (field.type === 'row') {
      const inRow = beforeValidateOf(field.fields, name)
      if (inRow.length > 0) return inRow
    } else if ('name' in field && field.name === name) {
      return 'hooks' in field ? (field.hooks.beforeValidate ?? []) : []
    }
  }
  return []
}

describe('trimmedText', () => {
  describe('happy path', () => {
    it('removes the space before « siège archiépiscopal »', () => {
      expect(trimmedText({ value: ' siège archiépiscopal' })).toBe('siège archiépiscopal')
    })
  })

  describe('variants', () => {
    it('removes the space after « Historia ecclesiastica » and keeps the one inside', () => {
      expect(trimmedText({ value: 'Historia ecclesiastica ' })).toBe('Historia ecclesiastica')
    })

    it.each([
      ['importance reasons', ImportanceReasons.fields, 'name'],
      ['sources', Sources.fields, 'title'],
      ['confessions', Confessions.fields, 'name'],
      ['event types', EventTypes.fields, 'name'],
      ['events', Events.fields, 'title'],
      ['people', People.fields, 'name'],
      ['siege engines', SiegeEngines.fields, 'name'],
      ['territories', Territories.fields, 'name'],
      ['places', Places.fields, 'name'],
    ] as const)('runs on the typed name of the %s', (_, fields, name) => {
      expect(beforeValidateOf(fields, name)).toContain(trimmedText)
    })
  })

  // L3: N/A — the hook refuses nothing; the field's own `required` says what is wrong.

  describe('unmanaged errors', () => {
    it('passes a value that is not text through unchanged', () => {
      expect(trimmedText({ value: null })).toBeNull()
      expect(trimmedText({ value: undefined })).toBeUndefined()
      expect(trimmedText({ value: 12 })).toBe(12)
    })
  })

  describe('edge cases', () => {
    it('reads a name of spaces only as empty, so the required name is refused', () => {
      expect(trimmedText({ value: ' \t ' })).toBe('')
    })
  })
})
