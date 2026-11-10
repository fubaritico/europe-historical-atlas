import type { LotOutcome } from './lotOutcome'
import type { NamedItem } from '../../../wikidata/placeLot'

/** The two fields of a place's lot (CMS-414). */
export type LotField = 'country' | 'region'

/** The items Wikidata offered for a field of the lot when it gave several — the list to choose from. */
export type LotChoices = Partial<Record<LotField, NamedItem[]>>

/** One value written into the place form. */
export interface FieldUpdate {
  /** The field's path, `country.name`. */
  path: string
  /** Its new value; empty clears it. */
  value: string
}

/**
 * The writes that put one item into a field of the lot.
 * @param field - `country` or `region`
 * @param item - the item, or `null` to clear the field
 * @returns the two writes, name and id
 */
export function lotFieldUpdates(field: LotField, item: NamedItem | null): FieldUpdate[] {
  return [
    { path: `${field}.name`, value: item?.name ?? '' },
    { path: `${field}.wikidata`, value: item?.wikidata ?? '' },
  ]
}

/**
 * What the form writes for a lot, and the lists it offers: one item fills its field; several or none **clear** it —
 * a country left from an item chosen before would sit beside a sentence saying nothing was filled (review ARCH-001,
 * 2026-11-10) — and several are offered.
 * @param outcome - the lot's outcome
 * @returns the writes, in field order, and the lists by field
 */
export function lotUpdates(outcome: LotOutcome): { updates: FieldUpdate[]; choices: LotChoices } {
  const choices: LotChoices = {}
  const updates = (['country', 'region'] as const).flatMap((field) => {
    const each = outcome[field]
    if (each.kind === 'choose') choices[field] = each.items
    return lotFieldUpdates(field, each.kind === 'fill' ? each.item : null)
  })
  return { updates, choices }
}
