import { formatHistoricalDate } from '@europe-historical-atlas/core/time/formatHistoricalDate'
import { isDateRefusal } from '@europe-historical-atlas/core/time/historicalDate'

import { toHistoricalDate } from './dateReading'

import type { EventDateFields } from './historicalDate'

/** What parts a city's name from its date in a sheet's title. */
const SEPARATOR = ' — '

/**
 * A city sheet's title in the admin's list — « Paris — 1100 », « Paris — vers 1100 », « Paris — 1100–1150 » — so two
 * sheets of one place never read as a duplicate (the dev, 2026-10-31). The date is written by `core`'s one rule, the
 * same as in the overlap's refusal.
 * @param placeName - the place's French name
 * @param date - the sheet's date group
 * @returns the title, or `null` when the date cannot be read — the date field's own rule refuses the save then
 */
export function sheetTitle(placeName: string, date: EventDateFields): string | null {
  const read = toHistoricalDate(date)
  if (isDateRefusal(read)) return null
  return `${placeName}${SEPARATOR}${formatHistoricalDate(read, 'fr')}`
}
