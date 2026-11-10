import { describe, expect, it } from 'vitest'

import { countryField, lotGroup, regionField } from './lot'

import type { TextField } from 'payload'

/**
 * The id field of a lot's group.
 * @param group - the group
 * @returns its `wikidata` field
 */
function idField(group: ReturnType<typeof lotGroup>): TextField {
  const field = group.fields.find((each) => 'name' in each && each.name === 'wikidata')
  if (field?.type !== 'text') throw new Error('no wikidata field')
  return field
}

describe('lot', () => {
  describe('happy path', () => {
    it('gives a place its country and its region today, each a name and an id', () => {
      expect(
        [countryField, regionField].map((group) => [
          group.name,
          group.fields.map((each): string | null => ('name' in each ? each.name : null)),
        ])
      ).toEqual([
        ['country', ['name', 'wikidata']],
        ['region', ['name', 'wikidata']],
      ])
    })
  })

  describe('variants', () => {
    it('accepts an empty id — Wikidata may give none', () => {
      const validate = idField(countryField).validate as (value: string) => true | string
      expect(validate('')).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('refuses an id that is not Q and digits', () => {
      const validate = idField(regionField).validate as (value: string) => true | string
      expect(validate('Sicile')).toBe(
        'Un identifiant Wikidata s’écrit Q suivi de chiffres : Q1218.'
      )
    })
  })

  // L4–L5: N/A — configuration; the reading and the filling are tested in placeLot and lotOutcome.
})
