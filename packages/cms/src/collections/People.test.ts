import { describe, expect, it } from 'vitest'

import { MCP_COLLECTIONS } from '../mcp/mcpAccess'

import { Events } from './Events'
import { PERSON_KINDS, People } from './People'

import type { Field } from 'payload'

/**
 * Every named field of the register, looking through rows.
 * @param fields - the list
 * @returns the fields by name
 */
function byName(fields: readonly Field[]): Map<string, Field> {
  const found = new Map<string, Field>()
  for (const field of fields) {
    if (field.type === 'row')
      for (const [name, inner] of byName(field.fields)) found.set(name, inner)
    else if ('name' in field) found.set(field.name, field)
  }
  return found
}

/**
 * Whether a field is shown for a record of a kind — its form condition, read with that kind.
 * @param field - the field
 * @param kind - the record's kind
 * @returns shown or not
 */
function shownFor(field: Field | undefined, kind: string): boolean {
  const condition = field?.admin?.condition
  if (condition === undefined) return true
  return condition({ kind }, {}, {
    blockData: {},
    operation: 'update',
    path: [],
    user: null,
  } as never)
}

const fields = byName(People.fields)

describe('People', () => {
  describe('happy path', () => {
    it('is the register « Personnes », slug people, a required French name, its other languages in its table', () => {
      expect(People.slug).toBe('people')
      expect(People.labels).toEqual({ singular: 'Personne', plural: 'Personnes' })
      // French alone since 2026-11-23 (CMS-495): the other languages are the table `otherNames`
      expect(fields.get('name')).toMatchObject({ type: 'text', required: true })
      expect(fields.get('name')).not.toHaveProperty('localized')
      expect(fields.get('otherNames')).toMatchObject({ type: 'array' })
    })

    it('is the collection an event’s actors point at', () => {
      expect(
        Events.fields.find((field) => 'name' in field && field.name === 'actors')
      ).toMatchObject({
        type: 'relationship',
        relationTo: 'people',
        hasMany: true,
      })
    })

    it('is open to the MCP keys: find, create, change — never delete', () => {
      expect(MCP_COLLECTIONS[People.slug]?.enabled).toEqual({
        find: true,
        create: true,
        update: true,
        delete: false,
      })
    })
  })

  describe('variants', () => {
    it('shows birth, death, the house and the parents for a person, not a house’s foundation, end or founder', () => {
      for (const name of ['born', 'died', 'house', 'father', 'mother'])
        expect(shownFor(fields.get(name), 'person')).toBe(true)
      for (const name of ['founded', 'ended', 'founder'])
        expect(shownFor(fields.get(name), 'person')).toBe(false)
    })

    it('shows the foundation, the end and the founder for a house, not a person’s birth, death or house', () => {
      for (const name of ['founded', 'ended', 'founder'])
        expect(shownFor(fields.get(name), 'house')).toBe(true)
      for (const name of ['born', 'died', 'house', 'father', 'mother'])
        expect(shownFor(fields.get(name), 'house')).toBe(false)
    })

    it('offers a house among the houses only, a founder and the parents among the persons only', () => {
      expect(fields.get('house')).toMatchObject({
        relationTo: 'people',
        filterOptions: { kind: { equals: 'house' } },
      })
      for (const name of ['founder', 'father', 'mother'])
        expect(fields.get(name)).toMatchObject({
          relationTo: 'people',
          filterOptions: { kind: { equals: 'person' } },
        })
    })
  })

  describe('managed errors', () => {
    it('allows only the two kinds, a person by default', () => {
      const kind = fields.get('kind')
      expect(kind).toMatchObject({ required: true, defaultValue: 'person' })
      const options = kind !== undefined && 'options' in kind ? kind.options : []
      expect(options.map((option) => (typeof option === 'string' ? option : option.value))).toEqual(
        [...PERSON_KINDS]
      )
    })
  })

  describe('edge cases', () => {
    it('carries no rank, role or confession: they are dated claims, never fields of a person', () => {
      for (const name of ['rank', 'role', 'confession', 'title'])
        expect(fields.has(name)).toBe(false)
    })
  })

  // L4: N/A — no async work, nothing read from outside; a refused save is Payload's own validation.
})
