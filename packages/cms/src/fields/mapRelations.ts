import type { Field } from 'payload'

/**
 * The one walk over a record's relations (CMS-509, review ARCH-001): every relationship of a record, inside a list, a
 * group, a row or a tab, a field of one value or of many, handed to a visit that may change it. The merge moves the
 * citations of a duplicate with it (`merge/repoint`), the restore guard reads what a record points at with it
 * (`collections/refuseRestoringOverBin`) — so a kind of field taught here is taught to both. The schema alone, with no
 * record, is read by `collections/schemaCiters`.
 *
 * **Immutable, and the same value when nothing changes**: a level is copied only where a visit returned another value,
 * so the merge saves only the fields it changed.
 */

/**
 * What a relationship's value becomes.
 * @param value - one value of the field: an id, a populated record, or `{ relationTo, value }`
 * @param relationTo - the collection, or collections, the field points at
 * @returns the value to keep — the same one when unchanged
 */
export type RelationVisit = (value: unknown, relationTo: string | string[]) => unknown

/**
 * Each value of a list mapped, the list kept as it was when none changed.
 * @param values - the list
 * @param each - what a value becomes
 * @returns a new list, or the same one
 */
function mappedList(values: readonly unknown[], each: (value: unknown) => unknown): unknown {
  const out = values.map(each)
  return out.some((value, index) => value !== values[index]) ? out : values
}

/**
 * A record with one field set, the same object when the value is the same.
 * @param record - the record
 * @param name - the field
 * @param value - its new value
 * @returns the record, copied when it changes
 */
function withValue(
  record: Record<string, unknown>,
  name: string,
  value: unknown
): Record<string, unknown> {
  return value === record[name] ? record : { ...record, [name]: value }
}

/**
 * A level of a record — the record itself, a row of a list, a group's value — with every relation visited.
 * @param fields - the fields of that level
 * @param level - its value
 * @param visit - what each relation's value becomes
 * @returns the level, copied where a value changed — the same value otherwise, and anything not an object as it is
 */
export function mapRelations(
  fields: readonly Field[],
  level: unknown,
  visit: RelationVisit
): unknown {
  if (level === null || typeof level !== 'object' || Array.isArray(level)) return level
  return fields.reduce(
    (record, field) => mapField(field, record, visit),
    level as Record<string, unknown>
  )
}

/**
 * One field of a level visited — a relationship, or the fields a list, a group, a row or a tab holds.
 * @param field - the field
 * @param record - the level
 * @param visit - what each relation's value becomes
 * @returns the level, copied when the field changed
 */
function mapField(
  field: Field,
  record: Record<string, unknown>,
  visit: RelationVisit
): Record<string, unknown> {
  if (field.type === 'tabs')
    return field.tabs.reduce(
      (level, tab) =>
        'name' in tab
          ? withValue(level, tab.name, mapRelations(tab.fields, level[tab.name], visit))
          : (mapRelations(tab.fields, level, visit) as Record<string, unknown>),
      record
    )
  if (field.type === 'relationship' || field.type === 'upload') {
    const value = record[field.name]
    const each = (one: unknown): unknown => visit(one, field.relationTo)
    return withValue(
      record,
      field.name,
      Array.isArray(value) ? mappedList(value, each) : each(value)
    )
  }
  if (!('fields' in field)) return record
  // A row or a collapsible holds its parent's fields; a list's rows each hold them; a group's value holds them once
  if (!('name' in field))
    return mapRelations(field.fields, record, visit) as Record<string, unknown>
  const nested = record[field.name]
  const row = (one: unknown): unknown => mapRelations(field.fields, one, visit)
  return withValue(
    record,
    field.name,
    Array.isArray(nested) ? mappedList(nested, row) : row(nested)
  )
}
