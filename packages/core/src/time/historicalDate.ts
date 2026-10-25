/**
 * A historical date — what this project dates things with, in place of `Date` (`plan.md`, P8; CORE-217).
 *
 * What we hold is almost never a day: a map is a year, a battle a year, a war an interval, a polity's
 * beginning "circa". `Date` forces a day we do not have, in a calendar that is not the period's. So a date
 * here is **an instant or an interval**, each end as precise as it is known — a year, a month, a day — and
 * marked *circa* when it is approximate. Only a day carries a calendar, because only a day can differ by it.
 *
 * Every claim of the uncertainty machine is dated (DESIGN-262, step 1): a bond *1125–1284*, a dependence
 * *circa 1100*. This is that date.
 *
 * **Read, never cast**: {@link readHistoricalDate} takes `unknown`, as from a file or a form, and answers the
 * date or the reason it is refused — a reason a form can show, and a file reader can turn into an
 * `AssetError` naming the field. The refusal is said too, through `warn` (`rules/error-handling.md`: no refusal is silent).
 */

import { z } from 'zod/mini'

import { CALENDARS, daysInMonth } from './calendar'
import { julianDayNumber } from './julianDay'

import type { Calendar } from './calendar'

/** One end of a date: a year, and the month and day when they are known. */
export interface HistoricalMoment {
  /** A historical year: negative for BC, **never `0`** — 1 BC is followed by AD 1. */
  year: number
  /** 1 to 12, or `null` when only the year is known. */
  month: number | null
  /** The day of the month, or `null`. A day needs its month and its calendar. */
  day: number | null
  /** The calendar the day is named in — set exactly when `day` is: Hastings, 14 October 1066, is Julian. */
  calendar: Calendar | null
  /** Approximate: "circa 1100". The year is the best estimate, not a bound. */
  circa: boolean
  /**
   * How many years either side a circa year may be — "circa 1100, ±5" is 1095–1105. `null` takes the default the
   * contributor sets (±10, the dev 2026-10-23, CORE-270 §8 Q3), never a constant here. Only on a circa year.
   */
  margin: number | null
}

/** A date: one moment, or an interval between two. */
export type HistoricalDate =
  /** A single moment: "1066", "circa 1100", "14 October 1066". */
  | { kind: 'instant'; at: HistoricalMoment }
  /** From one moment to another, both included: "1337–1453". */
  | { kind: 'interval'; from: HistoricalMoment; to: HistoricalMoment }

/** Which end of a date a refusal is about: the instant's, or one end of an interval. */
export type DateEnd = 'at' | 'from' | 'to'

/** Why a date is refused — every case, so whoever shows it can say which. */
export type DateRefusal =
  /** Not a date at all: a missing field, a wrong type, a month of 13. `detail` names the field. */
  | { kind: 'shape'; detail: string }
  /** The year `0`, which historical dating does not have. */
  | { kind: 'year-zero'; end: DateEnd }
  /** A day with no month to be the day of. */
  | { kind: 'day-without-month'; end: DateEnd }
  /** A day with no calendar: 14 October 1066 Julian and Gregorian are six days apart. */
  | { kind: 'day-without-calendar'; end: DateEnd }
  /** A calendar with no day: the calendars only differ by days, so it would say nothing. */
  | { kind: 'calendar-without-day'; end: DateEnd }
  /** A day the month does not have that year, in that calendar: 30 February, 29 February 1100 Gregorian. */
  | { kind: 'no-such-day'; end: DateEnd }
  /** An interval that ends before it begins. */
  | { kind: 'reversed' }
  /** A margin on a year that is not circa: an exact year has none. */
  | { kind: 'margin-without-circa'; end: DateEnd }

/** {@link HistoricalMoment}, in shape only — the rules between its fields are {@link momentRefusal}'s. */
const momentSchema: z.ZodMiniType<HistoricalMoment> = z.strictObject({
  year: z.int(),
  month: z.nullable(z.int().check(z.gte(1), z.lte(12))),
  day: z.nullable(z.int().check(z.gte(1), z.lte(31))),
  calendar: z.nullable(z.enum(CALENDARS)),
  circa: z.boolean(),
  margin: z.nullable(z.int().check(z.gte(1))),
})

/** {@link HistoricalDate}, in shape only. */
const dateSchema: z.ZodMiniType<HistoricalDate> = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('instant'), at: momentSchema }),
  z.strictObject({ kind: z.literal('interval'), from: momentSchema, to: momentSchema }),
])

/**
 * Read a date from what a file or a form holds.
 * @param value - anything; it earns its type here
 * @param warn - where a refusal is said; the console in the applications
 * @returns the date, or why it is refused
 */
export function readHistoricalDate(
  value: unknown,
  warn: (message: string) => void = (message) => {
    console.warn(message)
  }
): HistoricalDate | DateRefusal {
  const answer = check(value)
  if (isDateRefusal(answer)) warn(`Historical date refused: ${describeDateRefusal(answer)}`)
  return answer
}

/**
 * Whether {@link readHistoricalDate} refused.
 * @param answer - what it answered
 * @returns `true` for a refusal
 */
export function isDateRefusal(answer: HistoricalDate | DateRefusal): answer is DateRefusal {
  return answer.kind !== 'instant' && answer.kind !== 'interval'
}

/**
 * A refusal in one sentence, for a form or a log.
 * @param refusal - why the date was refused
 * @returns the reason, in English like the rest of the Cartographer
 */
export function describeDateRefusal(refusal: DateRefusal): string {
  switch (refusal.kind) {
    case 'shape':
      return `not a date — ${refusal.detail}`
    case 'year-zero':
      return `${refusal.end}: there is no year 0 — 1 BC is followed by AD 1`
    case 'day-without-month':
      return `${refusal.end}: a day needs its month`
    case 'day-without-calendar':
      return `${refusal.end}: a day needs its calendar, Julian or Gregorian`
    case 'calendar-without-day':
      return `${refusal.end}: a calendar only matters for a day`
    case 'no-such-day':
      return `${refusal.end}: that month has no such day that year`
    case 'reversed':
      return 'the interval ends before it begins'
    case 'margin-without-circa':
      return `${refusal.end}: only a circa year has a margin`
  }
}

/**
 * Whether one moment comes after another, at the precision both share. Two days compare as days, across
 * calendars; otherwise the year decides, then the month if both have one. "1100" is not after "March 1100".
 * @param a - the moment that should not be later
 * @param b - the moment it is compared with
 * @returns `true` when `a` is strictly later than `b`
 */
export function isAfter(a: HistoricalMoment, b: HistoricalMoment): boolean {
  if (
    a.day !== null &&
    b.day !== null &&
    a.month !== null &&
    b.month !== null &&
    a.calendar !== null &&
    b.calendar !== null
  ) {
    const later = julianDayNumber({ year: a.year, month: a.month, day: a.day }, a.calendar)
    const earlier = julianDayNumber({ year: b.year, month: b.month, day: b.day }, b.calendar)
    return later > earlier
  }
  if (a.year !== b.year) return a.year > b.year
  return a.month !== null && b.month !== null && a.month > b.month
}

/**
 * A date as a field of a larger file: the shape and every rule of {@link readHistoricalDate}, as a schema to nest
 * in another one. A refusal becomes an issue at that field, worded by {@link describeDateRefusal}.
 */
export const historicalDateSchema: z.ZodMiniType<HistoricalDate> = dateSchema.check(
  z.superRefine((date, context) => {
    const answer = check(date)
    if (isDateRefusal(answer)) {
      context.addIssue({ code: 'custom', message: describeDateRefusal(answer), input: date })
    }
  })
)

/**
 * One end of a date as a field of a larger file — a place's beginning, its end — with every rule of an end. A
 * refusal becomes an issue at that field.
 */
export const historicalMomentSchema: z.ZodMiniType<HistoricalMoment> = momentSchema.check(
  z.superRefine((moment, context) => {
    const refusal = momentRefusal(moment, 'at')
    if (refusal !== null) {
      context.addIssue({ code: 'custom', message: describeDateRefusal(refusal), input: moment })
    }
  })
)

/**
 * The shape, then the rules of each end, then the order of the two.
 * @param value - anything
 * @returns the date, or the first reason it fails
 */
function check(value: unknown): HistoricalDate | DateRefusal {
  const parsed = dateSchema.safeParse(value)
  if (!parsed.success) return { kind: 'shape', detail: shapeDetail(parsed.error) }
  const date = parsed.data
  if (date.kind === 'instant') return momentRefusal(date.at, 'at') ?? date
  const refusal = momentRefusal(date.from, 'from') ?? momentRefusal(date.to, 'to')
  if (refusal !== null) return refusal
  return isAfter(date.from, date.to) ? { kind: 'reversed' } : date
}

/**
 * What is wrong with one end, if anything.
 * @param moment - a well-shaped end
 * @param end - which end, for the refusal to name
 * @returns the refusal, or `null` when the end is a date
 */
function momentRefusal(moment: HistoricalMoment, end: DateEnd): DateRefusal | null {
  const { year, month, day, calendar } = moment
  if (year === 0) return { kind: 'year-zero', end }
  if (moment.margin !== null && !moment.circa) return { kind: 'margin-without-circa', end }
  if (day === null) return calendar === null ? null : { kind: 'calendar-without-day', end }
  if (month === null) return { kind: 'day-without-month', end }
  if (calendar === null) return { kind: 'day-without-calendar', end }
  return day > daysInMonth(year, month, calendar) ? { kind: 'no-such-day', end } : null
}

/**
 * The first issue zod found, as "path: message".
 * @param error - what `safeParse` failed with
 * @param error.issues - its issues, the first of which is named
 * @returns one clause naming the field
 */
function shapeDetail(error: {
  issues: readonly { path: PropertyKey[]; message: string }[]
}): string {
  const issue = error.issues[0]
  // zod never fails without an issue; if it ever does, that is its defect, said rather than worded over.
  if (issue === undefined) throw new Error('zod refused a date without saying why')
  const path = issue.path.map(String).join('.')
  return path === '' ? issue.message : `${path}: ${issue.message}`
}
