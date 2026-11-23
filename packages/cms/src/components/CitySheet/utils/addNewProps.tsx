import { PrefilledAddNew } from '../internal/PrefilledAddNew'

import type { CollectionSlug, Data } from 'payload'
import type { ReactNode } from 'react'

/** A « + » whose drawer opens with part of the new record already filled. */
export interface PrefilledCreate {
  /** What the new record's form opens with, read each time the drawer opens. */
  readonly data: Data
  /** The button's name and tooltip. */
  readonly label: string
}

/** What Payload's relationship field is handed for its « + »: its own, or ours after the list. */
export type AddNewProps =
  | { readonly allowCreate: boolean }
  | { readonly allowCreate: false; readonly AfterInput: ReactNode; readonly className: string }

/**
 * Which « + » a relationship field shows. Payload's own, unless the new record is to open with part of it filled —
 * Payload's « + » cannot be handed any — then ours (`PrefilledAddNew`) after the list, laid beside it by
 * `citySheet.css` (`city-sheet__relation--prefilled`), the list's corners squared by Payload's own
 * `relationship--allow-create`, as when its « + » is there. A field held read-only shows neither.
 * @param args - the field
 * @param args.collection - the collection it chooses in
 * @param args.prefilled - what a new record opens with, absent for Payload's « + »
 * @param args.readOnly - whether the field is held as it is
 * @param args.onCreate - called with the id of a record created in our drawer
 * @returns the props for Payload's field
 */
export function addNewProps({
  collection,
  prefilled,
  readOnly,
  onCreate,
}: {
  collection: CollectionSlug
  prefilled: PrefilledCreate | undefined
  readOnly: boolean
  onCreate: (id: number | string) => void
}): AddNewProps {
  if (prefilled === undefined || readOnly) return { allowCreate: prefilled === undefined }
  return {
    allowCreate: false,
    AfterInput: (
      <PrefilledAddNew
        collection={collection}
        initialData={prefilled.data}
        label={prefilled.label}
        onCreate={onCreate}
      />
    ),
    className: 'city-sheet__relation--prefilled relationship--allow-create',
  }
}
