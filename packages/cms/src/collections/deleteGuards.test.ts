import { describe, expect, it } from 'vitest'

import { CMS_COLLECTIONS } from './cmsCollections'
import { PeriodNames } from './PeriodNames'
import { PlacePeriods } from './PlacePeriods'
import { PLACE_CITERS, Places } from './Places'
import { refuseRestoringOverBin } from './refuseRestoringOverBin'
import { schemaCiters } from './schemaCiters'
import { SOURCE_CITERS, Sources } from './Sources'
import { Titles } from './Titles'
import { VassalLinks } from './VassalLinks'

/** Every collection of the CMS: what may point at a place or a source. */
const COLLECTIONS = CMS_COLLECTIONS

/**
 * Everything in the CMS that points at a collection, as « collection:path » — the schema's own reading
 * (`schemaCiters`, CMS-509), which the merge and the registers' refusals use too.
 * @param target - the collection pointed at
 * @returns the pointers, sorted
 */
function citersOf(target: string): string[] {
  return schemaCiters(COLLECTIONS, target)
    .map(({ collection, path }) => `${collection}:${path}`)
    .sort()
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

    // CMS-508, review QUAL-002: the bin's refusals, one per citer, beside the restore's (and the place's twin)
    it('hangs one refusal of the bin per citer on the place and on the source, after the restore’s', () => {
      expect(Places.hooks?.beforeChange).toHaveLength(PLACE_CITERS.length + 2)
      expect(Sources.hooks?.beforeChange).toHaveLength(SOURCE_CITERS.length + 1)
      for (const collection of [Places, Sources, Titles, PeriodNames, PlacePeriods, VassalLinks])
        expect(collection.hooks?.beforeChange?.[0]).toBe(refuseRestoringOverBin)
    })
  })

  // L3–L4: the refusals themselves run in a real base, `claims.test.ts`
  describe('edge cases', () => {
    it('finds no pointer at a collection nothing names', () => {
      expect(citersOf('nothing-of-the-kind')).toEqual([])
    })
  })
})
