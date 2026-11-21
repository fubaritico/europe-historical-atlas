import { describe, expect, it } from 'vitest'

import { Confessions } from './Confessions'
import { Events } from './Events'
import { EventTypes } from './EventTypes'
import { ImportanceReasons } from './ImportanceReasons'
import { People } from './People'
import { PeriodNames } from './PeriodNames'
import { PlacePeriods } from './PlacePeriods'
import { PLACE_CITERS, Places } from './Places'
import { SiegeEngines } from './SiegeEngines'
import { SOURCE_CITERS, Sources } from './Sources'
import { Territories } from './Territories'
import { Titles } from './Titles'
import { Users } from './Users'
import { VassalLinks } from './VassalLinks'

import type { CollectionConfig, Field } from 'payload'

/** Every collection of the CMS: what may point at a place or a source. */
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
 * Every field of a list of fields that points at a collection, by its path — `lines.source` inside a list or a group,
 * the fields of a row, a collapsible or a tab read as their parent's.
 * @param fields - the fields
 * @param target - the collection pointed at
 * @param prefix - the path of the list or group they are in
 * @returns the paths
 */
function pointersAt(fields: readonly Field[], target: string, prefix = ''): string[] {
  return fields.flatMap((field): string[] => {
    if (field.type === 'tabs')
      return field.tabs.flatMap((tab) =>
        pointersAt(tab.fields, target, 'name' in tab ? `${prefix}${tab.name}.` : prefix)
      )
    if (field.type === 'relationship' || field.type === 'upload') {
      const to = Array.isArray(field.relationTo) ? field.relationTo : [field.relationTo]
      return (to as string[]).includes(target) ? [`${prefix}${field.name}`] : []
    }
    if (!('fields' in field)) return []
    // A named list or group opens a path; a row or a collapsible holds its parent's fields.
    return pointersAt(field.fields, target, 'name' in field ? `${prefix}${field.name}.` : prefix)
  })
}

/**
 * Everything in the CMS that points at a collection, as « collection:path ».
 * @param target - the collection pointed at
 * @returns the pointers, sorted
 */
function citersOf(target: string): string[] {
  return COLLECTIONS.flatMap((collection) =>
    pointersAt(collection.fields, target).map((path) => `${collection.slug}:${path}`)
  ).sort()
}

// CMS-454: a place or a source is deleted over MCP only when nothing cites it. The base empties a field under a
// deleted record (`ON DELETE set null`), so a pointer the refusal does not know is a line that silently loses its
// source. These tests read the collections themselves: a field added later must be added to the citers.
describe('what a deletion is refused for', () => {
  describe('happy path', () => {
    it('knows every field of the CMS that points at a place', () => {
      const declared = PLACE_CITERS.map(({ collection, field }) => `${collection}:${field}`).sort()
      expect(declared).toEqual(citersOf('places'))
    })

    it('knows every field of the CMS that points at a source', () => {
      const declared = SOURCE_CITERS.map(({ collection, field }) => `${collection}:${field}`).sort()
      expect(declared).toEqual(citersOf('sources'))
    })
  })

  describe('variants', () => {
    it('finds a pointer inside a list: a line’s source, a sheet’s testimony', () => {
      expect(citersOf('sources')).toEqual(
        expect.arrayContaining([
          'titles:lines.source',
          'vassal-links:lines.source',
          'place-periods:testimonies.source',
        ])
      )
    })

    it('hangs one refusal per citer on the place and on the source', () => {
      expect(Places.hooks?.beforeDelete).toHaveLength(PLACE_CITERS.length)
      expect(Sources.hooks?.beforeDelete).toHaveLength(SOURCE_CITERS.length)
    })
  })

  // L3–L4: the refusals themselves run in a real base, `claims.test.ts`
  describe('edge cases', () => {
    it('finds no pointer at a collection nothing names', () => {
      expect(citersOf('nothing-of-the-kind')).toEqual([])
    })
  })
})
