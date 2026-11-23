import type { CollectionSlug, ValueWithRelation } from 'payload'
import type { ReactNode } from 'react'

/** The props of Payload's relationship field this stand-in reads. */
interface StandInProps {
  /** What Payload lays after the list — our « + » when the field's is not Payload's. */
  readonly AfterInput?: ReactNode
  /** Payload's own « + », shown when true or absent. */
  readonly allowCreate?: boolean
  /** Its label. */
  readonly label?: string
  /** The collections it chooses in; the first is the one. */
  readonly relationTo: string[]
  /** The record chosen. */
  readonly value?: ValueWithRelation | null
  /** Called with the record chosen, or `null` once emptied. */
  readonly onChange: (value: ValueWithRelation | null) => void
  /** Which records it offers, by collection; absent for every record. */
  readonly filterOptions?: Record<string, unknown>
}

/**
 * Payload's `RelationshipInput` for a test in jsdom, which cannot run it (it needs the admin's providers — its
 * configuration, its session, its drawers): a text box named by the field's label, holding the id chosen. Typing an
 * id chooses that record; emptying the box empties the field — what Payload's own field hands its `onChange`. The
 * filter it is handed is kept on the box as `data-filter` (JSON, `null` for none), so a test reads which records the
 * field was asked to offer. Payload's own « + » is a button « Créer (Payload) » when the field allows it; what it is
 * handed as `AfterInput` follows the box.
 * Mocked in by `vi.mock('@payloadcms/ui', …)` in the city sheet's tests.
 * @param props - the field's label, collection, value and `onChange`
 * @param props.AfterInput - what follows the box
 * @param props.allowCreate - whether Payload's own « + » is there
 * @param props.label - its label, the box's name
 * @param props.relationTo - the collections it chooses in
 * @param props.value - the record chosen
 * @param props.onChange - called with the record chosen, or `null` once emptied
 * @param props.filterOptions - which records it offers
 * @returns the box
 */
export function RelationshipInputStandIn({
  AfterInput,
  allowCreate = true,
  label,
  relationTo,
  value,
  onChange,
  filterOptions,
}: StandInProps) {
  const collection = (relationTo[0] ?? '') as CollectionSlug
  return (
    <>
      <input
        aria-label={label}
        data-filter={JSON.stringify(filterOptions ?? null)}
        value={value === null || value === undefined ? '' : String(value.value)}
        onChange={(event) => {
          const typed = event.target.value
          onChange(typed === '' ? null : { relationTo: collection, value: Number(typed) })
        }}
      />
      {allowCreate && <button type="button">Créer (Payload)</button>}
      {AfterInput}
    </>
  )
}
