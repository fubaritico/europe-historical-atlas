import { isDateRefusal } from '@europe-historical-atlas/core/time/historicalDate'

import { toHistoricalDate } from './dateReading'
import { relationId, relationIds } from './relationId'

/**
 * A city sheet as `core`'s schema reads it (`core/data/citySheet.ts`), from a document as Payload holds it — its
 * relations bare or populated, the date in the collection's groups. The server's check before a save and the export
 * read a sheet through it, so the two cannot read one differently.
 * @param data - the sheet's fields
 * @returns the candidate, or `null` when its date does not read
 */
export function citySheetCandidate(data: Record<string, unknown>): Record<string, unknown> | null {
  const date = toHistoricalDate(data.date ?? {})
  if (isDateRefusal(date)) return null
  const rows = Array.isArray(data.testimonies)
    ? (data.testimonies as Record<string, unknown>[])
    : []
  return {
    place: relationId(data.place),
    date,
    importance: data.importance,
    reasons: relationIds(data.reasons),
    testimonies: rows.map((row) => ({
      ...row,
      source: relationId(row.source),
      reason: relationId(row.reason),
      // The id is optional, so an emptied one is none; the name is not, and stays as typed for its own rule.
      holderQid: filled(row.holderQid),
    })),
    holderName: filled(data.holderName),
    holderQid: filled(data.holderQid),
  }
}

/**
 * An optional text field as the schema reads it: the admin saves an emptied field as `''`, which says no more than
 * nothing — so it is read as nothing, not as a name or an id the schema would refuse.
 * @param value - the field as stored
 * @returns the text, or `null` for nothing
 */
function filled(value: unknown): unknown {
  return value === '' || value === undefined ? null : value
}
