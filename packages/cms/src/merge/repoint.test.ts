import { describe, expect, it } from 'vitest'

import { repointed } from './repoint'

import type { Field } from 'payload'

/** A territory merged away, 412, into the one kept, 367. */
const MOVE = { target: 'territories', from: 412, to: 367 }

/** A collection that cites territories in every shape the schema has. */
const FIELDS: Field[] = [
  { name: 'territory', type: 'relationship', relationTo: 'territories' },
  { name: 'person', type: 'relationship', relationTo: 'people' },
  { name: 'many', type: 'relationship', relationTo: 'territories', hasMany: true },
  {
    name: 'lines',
    type: 'array',
    fields: [{ name: 'where', type: 'relationship', relationTo: 'territories' }],
  },
  {
    name: 'group',
    type: 'group',
    fields: [{ name: 'held', type: 'relationship', relationTo: 'territories' }],
  },
  { type: 'row', fields: [{ name: 'inRow', type: 'relationship', relationTo: 'territories' }] },
  {
    type: 'tabs',
    tabs: [
      {
        label: 'Plain',
        fields: [{ name: 'inTab', type: 'relationship', relationTo: 'territories' }],
      },
      {
        name: 'named',
        fields: [{ name: 'deep', type: 'relationship', relationTo: 'territories' }],
      },
    ],
  },
]

// CMS-509: what the merge saves on a record that cites the duplicate.
describe('repointed', () => {
  describe('happy path', () => {
    it('moves a title’s territory to the one kept, and gives that field alone to save', () => {
      expect(repointed(FIELDS, { id: 9, territory: 412, person: 412 }, MOVE)).toEqual({
        territory: 367,
      })
    })
  })

  describe('variants', () => {
    it('moves a citation inside a list, keeping every row and its id', () => {
      const lines = [
        { id: 'a', where: 412 },
        { id: 'b', where: 5 },
      ]
      expect(repointed(FIELDS, { lines }, MOVE)).toEqual({
        lines: [
          { id: 'a', where: 367 },
          { id: 'b', where: 5 },
        ],
      })
    })

    it('moves a citation in a field of many values, a group, a row, and both kinds of tab', () => {
      const record = {
        many: [5, 412],
        group: { held: 412 },
        inRow: 412,
        inTab: 412,
        named: { deep: 412 },
      }
      expect(repointed(FIELDS, record, MOVE)).toEqual({
        many: [5, 367],
        group: { held: 367 },
        inRow: 367,
        inTab: 367,
        named: { deep: 367 },
      })
    })

    it('reads a populated record and an id written as text', () => {
      expect(
        repointed(FIELDS, { territory: { id: 412, name: 'Ponthieu' }, inRow: '412' }, MOVE)
      ).toEqual({
        territory: 367,
        inRow: 367,
      })
    })
  })

  describe('managed errors', () => {
    it('gives nothing to save for a record that cites another territory, or none', () => {
      expect(
        repointed(FIELDS, { territory: 5, many: [6], lines: [{ id: 'a', where: null }] }, MOVE)
      ).toEqual({})
    })
  })

  describe('unmanaged errors', () => {
    it('leaves a list or a group whose value is not what the schema says as it is', () => {
      expect(repointed(FIELDS, { lines: 'broken', group: 7 }, MOVE)).toEqual({})
    })
  })

  describe('edge cases', () => {
    it('never moves a relation to another collection carrying the same id', () => {
      expect(repointed(FIELDS, { person: 412 }, MOVE)).toEqual({})
    })
  })
})
