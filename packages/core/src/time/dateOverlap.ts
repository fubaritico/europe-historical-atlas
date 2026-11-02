/**
 * Whether two dates share a year — the rule a contribution is validated by against what is already saved (ATLAS-295,
 * `files/plans/atlas/cities.md`, decision 7): two sheets of one place may not cover the same year, or the atlas could
 * not tell which one to show.
 *
 * Decided by the dev on 2026-10-30: **a date alone covers its year** (« 1100 » meets « 1100 », not « 1101 »); **an
 * interval covers its start to its end, both included**; **circa does not widen** — the margin is our doubt about
 * the date, not a duration of the thing dated, so « circa 1100 » occupies 1100 and leaves 1105 free. Months and days
 * do not narrow either: a sheet is a picture of a year.
 */

import type { HistoricalDate } from './historicalDate'

/** The years a date covers, both included. Historical years, so 1 BC (`-1`) comes right before AD 1. */
export interface YearSpan {
  /** The first year covered. */
  readonly from: number
  /** The last year covered — the same as `from` for a date alone. */
  readonly to: number
}

/**
 * The years a date covers.
 * @param date - a date, already read
 * @returns its first and last year
 */
export function yearSpanOf(date: HistoricalDate): YearSpan {
  return date.kind === 'instant'
    ? { from: date.at.year, to: date.at.year }
    : { from: date.from.year, to: date.to.year }
}

/**
 * Whether two dates cover at least one year in common.
 * @param a - one date
 * @param b - another
 * @returns `true` when they share a year
 */
export function datesOverlap(a: HistoricalDate, b: HistoricalDate): boolean {
  const first = yearSpanOf(a)
  const second = yearSpanOf(b)
  return first.from <= second.to && second.from <= first.to
}

/**
 * Whether a date covers a year, by the same rule — what the atlas and the Cartographer show a year by: its events, its
 * cities.
 * @param date - a date, already read
 * @param year - the year
 * @returns `true` when the date covers it
 */
export function dateCoversYear(date: HistoricalDate, year: number): boolean {
  const span = yearSpanOf(date)
  return span.from <= year && year <= span.to
}
