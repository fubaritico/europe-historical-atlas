import { useForm } from '@payloadcms/ui'

import { lotFieldUpdates, lotUpdates } from '../utils/lotUpdates'

import type { NamedItem } from '../../../wikidata/placeLot'
import type { LotOutcome } from '../utils/lotOutcome'
import type { FieldUpdate, LotChoices, LotField } from '../utils/lotUpdates'

/** What the lookup does with the place form's lot fields. */
export interface LotFields {
  /**
   * Fill one field from one item.
   * @param field - `country` or `region`
   * @param item - the item
   * @returns nothing
   */
  fill: (field: LotField, item: NamedItem) => void
  /**
   * Write a lot's outcome into the form — one item fills, several or none clear — and keep the lists.
   * @param outcome - the lot's outcome
   * @returns the lists to offer, by field
   */
  apply: (outcome: LotOutcome) => LotChoices
}

/**
 * The place form's lot fields, written from Wikidata — never one picked among several (the dev, 2026-11-10).
 * @returns how to write them
 */
export function useLotFields(): LotFields {
  const { dispatchFields, setModified } = useForm()

  const write = (updates: FieldUpdate[]): void => {
    for (const { path, value } of updates) dispatchFields({ type: 'UPDATE', path, value })
    setModified(true)
  }
  return {
    fill: (field, item) => {
      write(lotFieldUpdates(field, item))
    },
    apply: (outcome) => {
      const { updates, choices } = lotUpdates(outcome)
      write(updates)
      return choices
    },
  }
}
