import { datesOverlap } from '@europe-historical-atlas/core/time/dateOverlap'
import { isDateRefusal } from '@europe-historical-atlas/core/time/historicalDate'

import { toHistoricalDate } from './historicalDate'

import type { EventDateFields } from './historicalDate'
import type { HistoricalDate } from '@europe-historical-atlas/core/time/historicalDate'

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
 * validated by (ATLAS-295, `files/plans/atlas/cities.md`, decision 7). The server applies it at save today; the
 * contribution screen to come will apply the same function while typing.
 *
 * A date the form has not finished, or that its own field refuses, overlaps nothing: the date field says what is
 * wrong with it, and this rule has nothing to add until it is a date. A **saved** sheet whose date does not read is
 * another matter — every sheet passed this field's check to be saved, so one that fails it now is a defect, thrown
 * rather than skipped, since skipping it would let a second sheet in over it unseen.
 * @param date - the date being entered
 * @param saved - the place's other sheets
 * @param ownId - the id of the sheet being edited, absent for a new one
 * @returns the sheet in the way, or `null`
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
