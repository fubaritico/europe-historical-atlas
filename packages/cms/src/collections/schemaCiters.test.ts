import { describe, expect, it } from 'vitest'

import { Confessions } from './Confessions'
import { Events } from './Events'
import { EventTypes } from './EventTypes'
import { ImportanceReasons } from './ImportanceReasons'
import { People } from './People'
import { PeriodNames } from './PeriodNames'
import { PlacePeriods } from './PlacePeriods'
import { Places } from './Places'
import { schemaCiters } from './schemaCiters'
import { SiegeEngines } from './SiegeEngines'
import { Sources } from './Sources'
import { Territories } from './Territories'
import { Titles } from './Titles'
import { Users } from './Users'
import { VassalLinks } from './VassalLinks'

import type { CollectionConfig, Field } from 'payload'

/** Every collection of the CMS. */
const COLLECTIONS: CollectionConfig[] = [
  Events,
  EventTypes,
  SiegeEngines,
  Places,
  PlacePeriods,
  PeriodNames,
  ImportanceReasons,
  Confessions,
  People,
  Territories,
  Titles,
  VassalLinks,
  Sources,
  Users,
]

/**
 * The citers of a collection, as « collection:path ».
 * @param target - the collection cited
 * @returns the citers
 */
const citers = (target: string): string[] =>
  schemaCiters(COLLECTIONS, target).map(({ collection, path }) => `${collection}:${path}`)

const polymorphic = (fields: readonly Field[]): string[] =>
  fields.flatMap((field): string[] => {
    if (field.type === 'tabs') return field.tabs.flatMap((tab) => polymorphic(tab.fields))
    if (
      (field.type === 'relationship' || field.type === 'upload') &&
      Array.isArray(field.relationTo)
    )
      return [field.name]
    return 'fields' in field ? polymorphic(field.fields) : []
  })

// CMS-509: what can cite a record, read from the schema — the merge moves all of it, the registers' refusals read it.
describe('schemaCiters', () => {
  describe('happy path', () => {
    it('finds the titles that name a territory', () => {
      expect(citers('territories')).toContain('titles:territory')
    })
  })

  describe('variants', () => {
    it('finds a register citing itself: a person’s house, a house’s founder', () => {
      expect(citers('people')).toEqual(
        expect.arrayContaining(['titles:person', 'people:house', 'people:founder'])
      )
    })

    it('finds a citation inside a list: a confession in a sheet’s communities', () => {
      expect(
        citers('confessions').some((citer) => citer.startsWith('place-periods:communities.'))
      ).toBe(true)
    })
  })

  // L3–L4: N/A — a reading of the schema's literals.

  describe('edge cases', () => {
    it('finds nothing that cites a collection nothing names', () => {
      expect(citers('nothing-of-the-kind')).toEqual([])
    })

    // Review SEC-001: a relation to several collections is not read — the merge and the refusals would not see it
    it('finds no relation of the CMS that points at several collections, which none of them would read', () => {
      expect(
        COLLECTIONS.flatMap(({ slug, fields }) =>
          polymorphic(fields).map((name) => `${slug}:${name}`)
        )
      ).toEqual([])
    })

    it('sorts the citers by collection, then path', () => {
      const found = citers('sources')
      expect(found).toEqual([...found].sort((a, b) => a.localeCompare(b)))
    })
  })
})
