import { describe, expect, it } from 'vitest'

import { Confessions } from './Confessions'
import { PlacePeriods } from './PlacePeriods'

import type { Field } from 'payload'

/**
 * Every relationship field of a list, looking through arrays, as the sheet nests its communities and its lines.
 * @param fields - the list
 * @returns the collections the relationships point at, one entry per field, with the field's path
 */
function relationTargets(fields: readonly Field[], prefix = ''): { path: string; to: unknown }[] {
  return fields.flatMap((field) => {
    const path = 'name' in field ? `${prefix}${field.name}` : prefix
    if (field.type === 'relationship') return [{ path, to: field.relationTo }]
    if (field.type === 'array') return relationTargets(field.fields, `${path}.`)
    return []
  })
}

describe('Confessions', () => {
  it('is the collection both confession fields of a sheet point at', () => {
    const targets = relationTargets(PlacePeriods.fields).filter(({ path }) =>
      path.endsWith('confession')
    )
    expect(targets).toEqual([
      { path: 'communities.confession', to: Confessions.slug },
      { path: 'testimonies.confession', to: Confessions.slug },
    ])
  })

  it('has a required name in every locale', () => {
    const [name] = Confessions.fields
    expect(name).toMatchObject({ name: 'name', type: 'text', required: true, localized: true })
  })
})
