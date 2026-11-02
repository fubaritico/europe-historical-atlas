/**
 * The events of one year — the map shows a year's events and no other's (the dev, 2026-11-02: *"the events are shown
 * on one year only"*). Whether a date belongs to a year is the dev's rule of 2026-10-30 (`core/time/dateOverlap`): a
 * date alone covers its year, an interval its start to its end both included, circa does not widen.
 */

import { dateCoversYear } from '@europe-historical-atlas/core/time/dateOverlap'

import type { HistoricalDate } from '@europe-historical-atlas/core/time/historicalDate'

/**
 * Keep the events whose date covers a year.
 * @param events - the events, each with its date
 * @param year - the year shown
 * @returns those of that year, in their order
 */
export function eventsOfYear<Event extends { readonly date: HistoricalDate }>(
  events: readonly Event[],
  year: number
): Event[] {
  return events.filter(({ date }) => dateCoversYear(date, year))
}
