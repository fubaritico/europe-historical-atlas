import { RelationshipInput } from '@payloadcms/ui'

import type { CollectionSlug, ValueWithRelation } from 'payload'

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
}: {
  path: string
  collection: CollectionSlug
  label: string
  description: string
  value: number | string | null
  onChange: (id: number | string | null) => void
  readOnly?: boolean
}) {
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
      label={label}
      description={description}
      value={value === null ? null : { relationTo: collection, value }}
      onChange={handleChange}
      // One collection: its options flat, as Payload's own field shows them, not under the collection's name
      formatDisplayedOptions={(groups) => groups.flatMap((group) => group.options)}
    />
  )
}
