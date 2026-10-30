import { datesOverlap } from '@europe-historical-atlas/core/time/dateOverlap'
import { isDateRefusal } from '@europe-historical-atlas/core/time/historicalDate'

import { toHistoricalDate } from './dateReading'

import type { EventDateFields } from './dateReading'
import type { HistoricalDate } from '@europe-historical-atlas/core/time/historicalDate'

/** Where the overlap's refusal is shown — by the server and by the form alike: under the year the date begins with. */
export const OVERLAP_PATH = 'date.start.year'

/** A city-at-a-date already saved, as much of it as the overlap needs. */
export interface SavedSheet {
  /** Its id, so a sheet being edited is not compared with itself. */
  readonly id: number | string
  /** Its date, as the form holds it. */
  readonly date: EventDateFields
}

/** The saved sheet a new one overlaps, and its date read. */
export interface SheetOverlap {
  /** The sheet in the way. */
  readonly sheet: SavedSheet
  /** Its date, read — for the message to write it. */
  readonly date: HistoricalDate
}

/**
 * The first saved sheet of the same place whose date shares a year with this one — the rule a city-at-a-date is
 * validated by (ATLAS-295, `files/plans/atlas/cities.md`, decision 7). The server applies it at save, the contribution
 * screen while typing (`components/CitySheet/utils/validateSheet.ts`), whose read refuses an unreadable saved sheet first.
 *
 * A date the form has not finished, or that its own field refuses, overlaps nothing: the date field says what is
 * wrong with it, and this rule has nothing to add until it is a date. A **saved** sheet whose date does not read is
 * another matter — every sheet passed this field's check to be saved, so one that fails it now is a defect, thrown
 * rather than skipped, since skipping it would let a second sheet in over it unseen.
 * @param date - the date being entered
 * @param saved - the place's other sheets
 * @param ownId - the id of the sheet being edited, absent for a new one
 * @returns the sheet in the way, or `null`
 * @throws {Error} when a saved sheet holds a date that does not read — a defect, never skipped
 */
export function overlappingSheet(
  date: EventDateFields,
  saved: readonly SavedSheet[],
  ownId?: number | string
): SheetOverlap | null {
  const own = toHistoricalDate(date)
  if (isDateRefusal(own)) return null
  for (const sheet of saved) {
    if (ownId !== undefined && String(sheet.id) === String(ownId)) continue
    const theirs = toHistoricalDate(sheet.date)
    if (isDateRefusal(theirs)) {
      throw new Error(
        `[CMS] saved city-at-a-date ${String(sheet.id)} holds an unreadable date (${theirs.kind})`
      )
    }
    if (datesOverlap(own, theirs)) return { sheet, date: theirs }
  }
  return null
}
