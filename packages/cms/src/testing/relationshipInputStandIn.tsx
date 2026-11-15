import type { CollectionSlug, ValueWithRelation } from 'payload'

/** The props of Payload's relationship field this stand-in reads. */
interface StandInProps {
  /** Its label. */
  readonly label?: string
  /** The collections it chooses in; the first is the one. */
  readonly relationTo: string[]
  /** The record chosen. */
  readonly value?: ValueWithRelation | null
  /** Called with the record chosen, or `null` once emptied. */
  readonly onChange: (value: ValueWithRelation | null) => void
}

/**
 * Payload's `RelationshipInput` for a test in jsdom, which cannot run it (it needs the admin's providers — its
 * configuration, its session, its drawers): a text box named by the field's label, holding the id chosen. Typing an
 * id chooses that record; emptying the box empties the field — what Payload's own field hands its `onChange`.
 * Mocked in by `vi.mock('@payloadcms/ui', …)` in the city sheet's tests.
 * @param props - the field's label, collection, value and `onChange`
 * @param props.label - its label, the box's name
 * @param props.relationTo - the collections it chooses in
 * @param props.value - the record chosen
 * @param props.onChange - called with the record chosen, or `null` once emptied
 * @returns the box
 */
export function RelationshipInputStandIn({ label, relationTo, value, onChange }: StandInProps) {
  const collection = (relationTo[0] ?? '') as CollectionSlug
  return (
    <input
      aria-label={label}
      value={value === null || value === undefined ? '' : String(value.value)}
      onChange={(event) => {
        const typed = event.target.value
        onChange(typed === '' ? null : { relationTo: collection, value: Number(typed) })
      }}
    />
  )
}
