import {
  isDateRefusal,
  readHistoricalDate,
} from '@europe-historical-atlas/core/time/historicalDate'

import type { Calendar } from '@europe-historical-atlas/core/time/calendar'
import type {
  DateRefusal,
  HistoricalDate,
  HistoricalMoment,
} from '@europe-historical-atlas/core/time/historicalDate'

/*
 * A date as the CMS stores it, read through `core` — free of Payload's code, because the contribution screens read it
 * in the page too; the field configs that use it stay in `historicalDate.ts`.
 */

/**
 * One end of a date as the form holds it — the same group for an event's beginning and end and for a place's
 * existence, so every date of the tool is entered and checked one way.
 */
export interface MomentFields {
  /** The year. Negative before Christ. Empty when the end is not given. */
  year?: number | null
  /** Its month, 1 to 12, when known. */
  month?: number | null
  /** Its day, when known. */
  day?: number | null
  /** The year is an estimate: "vers 1100". */
  circa?: boolean | null
  /** How many years either side the estimate may be; empty takes the default of ±10. */
  margin?: number | null
  /** The calendar of the day: Julian for the Middle Ages. Only read when a day is given. */
  calendar?: Calendar | null
}

/** An event's date: a beginning, and an end for something that lasted. */
export interface EventDateFields {
  /** When it happened, or began. */
  start?: MomentFields | null
  /** When it ended — empty for a single moment. */
  end?: MomentFields | null
}

/**
 * Whether an end of a date was given at all.
 * @param fields - the group
 * @returns `true` when it has a year
 */
function given(fields: MomentFields | null | undefined): fields is MomentFields & { year: number } {
  return fields?.year !== null && fields?.year !== undefined
}

/**
 * One end, as `core` holds it.
 * @param fields - the group, with its year
 * @returns the moment
 */
function moment(fields: MomentFields & { year: number }): HistoricalMoment {
  const day = fields.day ?? null
  return {
    year: fields.year,
    month: fields.month ?? null,
    day,
    calendar: day === null ? null : (fields.calendar ?? null),
    circa: fields.circa === true,
    margin: fields.margin ?? null,
  }
}

/**
 * Read a date through `core` — so the year 0, a 30 February, a margin on an exact year or an end before the
 * beginning are refused here exactly as everywhere else. Silent: the form shows the refusal, the export throws it.
 * @param value - the date to check
 * @returns the date, or why it is refused
 */
function check(value: HistoricalDate): HistoricalDate | DateRefusal {
  return readHistoricalDate(value, () => undefined)
}

/**
 * Whether one end was refused. Not `core`'s `isDateRefusal`, which tells a refusal from a *date* by its `kind` — a
 * moment has none, so every valid end would read as refused.
 * @param answer - what {@link toHistoricalMoment} answered, not `null`
 * @returns `true` for a refusal
 */
export function isMomentRefusal(answer: HistoricalMoment | DateRefusal): answer is DateRefusal {
  return 'kind' in answer
}

/**
 * One end of a date, or nothing when it was not given.
 * @param fields - the group
 * @returns the moment, `null` when there is no year, or why it is refused
 */
export function toHistoricalMoment(
  fields: MomentFields | null | undefined
): HistoricalMoment | DateRefusal | null {
  if (!given(fields)) return null
  const answer = check({ kind: 'instant', at: moment(fields) })
  return isDateRefusal(answer) ? answer : moment(fields)
}

/**
 * An event's date: an instant, or an interval when it has an end.
 * @param fields - the event's date group
 * @returns the date, or why it is refused
 */
export function toHistoricalDate(fields: EventDateFields): HistoricalDate | DateRefusal {
  if (!given(fields.start)) return { kind: 'shape', detail: 'start.year' }
  const start = moment(fields.start)
  if (!given(fields.end)) return check({ kind: 'instant', at: start })
  return check({ kind: 'interval', from: start, to: moment(fields.end) })
}

/**
 * Whether two ends are in order: the later one not before the earlier.
 * @param earlier - the beginning
 * @param later - the end
 * @returns the refusal when they are reversed or one is wrong, else `null`
 */
export function orderRefusal(
  earlier: MomentFields | null | undefined,
  later: MomentFields | null | undefined
): DateRefusal | null {
  if (!given(earlier) || !given(later)) return null
  const answer = check({ kind: 'interval', from: moment(earlier), to: moment(later) })
  return isDateRefusal(answer) ? answer : null
}
