import { RelationshipInput } from '@payloadcms/ui'
import { useMemo } from 'react'

import type { CollectionSlug, ValueWithRelation, Where } from 'payload'

/**
 * One record of a collection, chosen with Payload's own relationship field (the dev, 2026-11-16, his screenshot of
 * « Lieu »): type to search the list and choose **one**; ✎ opens the chosen one in a drawer, ✕ empties the field, and
 * the « + » joined to the field creates a new one in a drawer — its own fields with their own « + », the drawers
 * stacking. The same field as on Payload's pages, so a gesture learnt there holds here.
 *
 * Controlled from outside — the sheet's Formik, or a line's state — since the sheet is not Payload's form: what
 * Payload's `RelationshipField` does around this input (an id in, an id out) is done here.
 * @param props - the field
 * @param props.path - its name in the page, unique: `holderTitle`, `link-10-suzerain`
 * @param props.collection - the collection it chooses in
 * @param props.label - its label
 * @param props.description - the sentence under it
 * @param props.value - the id chosen, `null` for none
 * @param props.onChange - called with the id chosen, or `null` once emptied
 * @param props.readOnly - held as it is: while what it chose is being saved
 * @param props.required - marked required — its star; the form says what is missing
 * @param props.only - the records offered, when not all of the collection: the names of one place — the same object
 *   from one render to the next, or the field empties its options at each
 * @returns the field
 */
export function RelationField({
  path,
  collection,
  label,
  description,
  value,
  onChange,
  readOnly = false,
  required = false,
  only,
}: {
  path: string
  collection: CollectionSlug
  label: string
  description: string
  value: number | string | null
  onChange: (id: number | string | null) => void
  readOnly?: boolean
  required?: boolean
  only?: Where
}) {
  // Kept the same object from one render to the next: Payload's field empties its list of options each time its
  // filter changes identity (3.92, `fields/Relationship/Input.js`, the effect on `filterOptions`), which a filter
  // rebuilt at every keystroke elsewhere in the form would do. `only` must itself be stable: its caller memoises it.
  const filterOptions = useMemo(
    () => (only === undefined ? undefined : { [collection]: only }),
    [collection, only]
  )

  // Handlers — Payload hands `null` once the field is emptied, whatever its type says
  const handleChange = (next: ValueWithRelation | null) => {
    onChange(next === null ? null : next.value)
  }

  // Render
  return (
    <RelationshipInput
      path={path}
      relationTo={[collection]}
      hasMany={false}
      allowCreate
      allowEdit
      readOnly={readOnly}
      required={required}
      label={label}
      description={description}
      value={value === null ? null : { relationTo: collection, value }}
      onChange={handleChange}
      {...(filterOptions === undefined ? {} : { filterOptions })}
      // One collection: its options flat, as Payload's own field shows them, not under the collection's name
      formatDisplayedOptions={(groups) => groups.flatMap((group) => group.options)}
    />
  )
}
