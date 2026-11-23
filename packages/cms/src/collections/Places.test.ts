import { describe, expect, it } from 'vitest'

import { validateOtherNames } from '../fields/nameForms'

import { Places } from './Places'
import { retitlePlaceSheets } from './retitleSheets'
import { Territories } from './Territories'

import type { Field } from 'payload'

describe('Places', () => {
  describe('happy path', () => {
    it('lets its cities’ sheets follow a saved place, so their titles keep its name', () => {
      expect(Places.hooks?.afterChange).toContain(retitlePlaceSheets)
    })

    // CMS-495, the dev's choice of 2026-11-23: a place's names in the other languages as a territory's.
    it('holds its names in the other languages in the territories’ table, checked by the same rule', () => {
      const field = Places.fields.find(
        (candidate: Field) => 'name' in candidate && candidate.name === 'otherNames'
      )
      if (field?.type !== 'array') throw new Error('the place has no table named otherNames')
      const territories = Territories.fields.find(
        (candidate: Field) => 'name' in candidate && candidate.name === 'otherNames'
      )
      expect(field.validate).toBe(validateOtherNames)
      expect(field.fields).toEqual(territories?.type === 'array' ? territories.fields : null)
    })
  })

  // L2–L5: N/A — the collection is configuration; the hook it wires is tested in retitleSheets.test.ts, the table's
  // rule in Territories.test.ts.
})
