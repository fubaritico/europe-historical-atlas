import type { Field } from 'payload'

/**
 * What in the CMS can cite a record of a collection, read from the schema itself (CMS-509): every relationship towards
 * it, in any collection, inside a list, a group, a row or a tab. One reading for the merge of two duplicates, which
 * moves every citation, and for the refusals that keep a cited record of a register in place — so a field added later
 * is cited without a list to keep (the lists of the places and the sources are held against this by
 * `deleteGuards.test.ts`). The CMS has no polymorphic relation: a relation to several collections is not read.
 */

/** A place a record can be cited from: the collection, and the field's path in it. */
export interface SchemaCiter {
  /** The collection whose records may cite it. */
  readonly collection: string
  /** The field's path — `lines.source` for a field inside a list or a group. */
  readonly path: string
}

/** A collection as the schema gives it: its slug and its fields. */
export interface SchemaCollection {
  /** Its slug. */
  readonly slug: string
  /** Its fields. */
  readonly fields: readonly Field[]
}

/**
 * Every field of a list of fields that points at a collection, by its path — `lines.source` inside a list or a group,
 * the fields of a row, a collapsible or an unnamed tab read as their parent's.
 * @param fields - the fields
 * @param target - the collection pointed at
 * @param prefix - the path of the list or group they are in
 * @returns the paths
 */
export function pointerPaths(fields: readonly Field[], target: string, prefix = ''): string[] {
  return fields.flatMap((field): string[] => {
    if (field.type === 'tabs')
      return field.tabs.flatMap((tab) =>
        pointerPaths(tab.fields, target, 'name' in tab ? `${prefix}${tab.name}.` : prefix)
      )
    if (field.type === 'relationship' || field.type === 'upload')
      return field.relationTo === target ? [`${prefix}${field.name}`] : []
    if (!('fields' in field)) return []
    // A named list or group opens a path; a row or a collapsible holds its parent's fields.
    return pointerPaths(field.fields, target, 'name' in field ? `${prefix}${field.name}.` : prefix)
  })
}

/**
 * Every place of the CMS a record of a collection can be cited from.
 * @param collections - every collection of the CMS
 * @param target - the collection whose records are cited
 * @returns the citers, sorted by collection then path
 */
export function schemaCiters(
  collections: readonly SchemaCollection[],
  target: string
): SchemaCiter[] {
  return collections
    .flatMap(({ slug, fields }) =>
      pointerPaths(fields, target).map((path) => ({ collection: slug, path }))
    )
    .sort((a, b) => `${a.collection}:${a.path}`.localeCompare(`${b.collection}:${b.path}`))
}
