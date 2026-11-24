import { describe, expect, it } from 'vitest'

import { PlacePeriods } from './PlacePeriods'
import { pointersOf } from './refuseRestoringOverBin'

import type { Field } from 'payload'

// CMS-508, review SEC-001 · ARCH-001: what a record points at, read from its fields, so a restore checks every relation.
describe('pointersOf', () => {
  describe('happy path', () => {
    it('reads a city sheet’s place, its name of the time, its holder and every source of its lines', () => {
      const sheet = {
        place: 7,
        periodName: 3,
        holderTitle: 11,
        testimonies: [{ source: 21 }, { source: 22 }],
      }
      expect(pointersOf(PlacePeriods.fields, sheet)).toEqual(
        expect.arrayContaining([
          { collection: 'places', id: 7 },
          { collection: 'period-names', id: 3 },
          { collection: 'titles', id: 11 },
          { collection: 'sources', id: 21 },
          { collection: 'sources', id: 22 },
        ])
      )
    })
  })

  describe('variants', () => {
    const FIELDS: Field[] = [
      { name: 'place', type: 'relationship', relationTo: 'places' },
      { name: 'many', type: 'relationship', relationTo: 'sources', hasMany: true },
      { name: 'either', type: 'relationship', relationTo: ['places', 'sources'] },
      {
        name: 'group',
        type: 'group',
        fields: [{ name: 'title', type: 'relationship', relationTo: 'titles' }],
      },
      { type: 'row', fields: [{ name: 'inRow', type: 'relationship', relationTo: 'places' }] },
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Plain',
            fields: [{ name: 'inTab', type: 'relationship', relationTo: 'places' }],
          },
          {
            name: 'named',
            fields: [{ name: 'deep', type: 'relationship', relationTo: 'sources' }],
          },
        ],
      },
    ]

    it('reads a populated record, a list of ids, a polymorphic value, a group, a row and both kinds of tab', () => {
      const doc = {
        place: { id: 1, name: 'Haan' },
        many: [2, 3],
        either: { relationTo: 'sources', value: 4 },
        group: { title: 5 },
        inRow: 6,
        inTab: 7,
        named: { deep: 8 },
      }
      expect(pointersOf(FIELDS, doc)).toEqual([
        { collection: 'places', id: 1 },
        { collection: 'sources', id: 2 },
        { collection: 'sources', id: 3 },
        { collection: 'sources', id: 4 },
        { collection: 'titles', id: 5 },
        { collection: 'places', id: 6 },
        { collection: 'places', id: 7 },
        { collection: 'sources', id: 8 },
      ])
    })
  })

  describe('managed errors', () => {
    it('reads nothing of an empty relation: a sheet with no name of the time is never held back for it', () => {
      expect(
        pointersOf(PlacePeriods.fields, { place: 7, periodName: null, testimonies: [] })
      ).toEqual([{ collection: 'places', id: 7 }])
    })
  })

  describe('unmanaged errors', () => {
    it('reads nothing of a record that is not an object', () => {
      expect([pointersOf(PlacePeriods.fields, null), pointersOf(PlacePeriods.fields, 'x')]).toEqual(
        [[], []]
      )
    })
  })

  describe('edge cases', () => {
    it('reads nothing of a bare id in a field that may point at two collections', () => {
      const either: Field[] = [
        { name: 'either', type: 'relationship', relationTo: ['places', 'sources'] },
      ]
      expect(pointersOf(either, { either: 4 })).toEqual([])
    })
  })
})
