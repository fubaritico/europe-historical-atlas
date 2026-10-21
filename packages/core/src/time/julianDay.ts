/**
 * The Julian Day Number: a plain count of days since 1 January 4713 BC in the Julian calendar. It is how a
 * day crosses from one calendar to the other — a day is one number whichever calendar names it, so a
 * conversion is "to the number, then back in the other calendar".
 *
 * Integer arithmetic only, from the standard algorithms (Fliegel & Van Flandern 1968 for the way in,
 * Richards' for the way back, as given by the *Explanatory Supplement to the Astronomical Almanac*). Valid
 * from 4713 BC on, which covers every date this atlas can hold.
 */

import { astronomicalYear, historicalYear } from './calendar'

import type { Calendar } from './calendar'

/** A day, named in one calendar. */
export interface CalendarDay {
  /** A historical year: negative for BC, never `0`. */
  year: number
  /** 1 for January to 12 for December. */
  month: number
  /** The day of the month, from 1. */
  day: number
}

/**
 * The Julian Day Number of a day.
 *
 * Takes the day as given: it does not check that the 30 February exists. That is the reader's job
 * (`historicalDate.ts`), which refuses such a day with its reason before anything is converted.
 * @param date - the day, in `calendar`
 * @param calendar - the calendar the day is named in
 * @returns its Julian Day Number — 2 451 545 for 1 January 2000, Gregorian
 */
export function julianDayNumber(date: CalendarDay, calendar: Calendar): number {
  const year = astronomicalYear(date.year)
  const { month, day } = date
  // Every division truncates toward zero, as the algorithms are written: `(month - 9) / 7` is negative from
  // March to August, where flooring would be off by a whole day.
  if (calendar === 'julian') {
    return (
      367 * year -
      Math.trunc((7 * (year + 5001 + Math.trunc((month - 9) / 7))) / 4) +
      Math.trunc((275 * month) / 9) +
      day +
      1729777
    )
  }
  const shift = Math.trunc((month - 14) / 12)
  return (
    Math.trunc((1461 * (year + 4800 + shift)) / 4) +
    Math.trunc((367 * (month - 2 - 12 * shift)) / 12) -
    Math.trunc((3 * Math.trunc((year + 4900 + shift) / 100)) / 4) +
    day -
    32075
  )
}

/**
 * The day a Julian Day Number falls on, named in a calendar.
 * @param julianDay - a Julian Day Number, 0 or more
 * @param calendar - the calendar to name it in
 * @returns the day, with a historical year
 */
export function calendarDay(julianDay: number, calendar: Calendar): CalendarDay {
  let f = julianDay + 1401
  if (calendar === 'gregorian') {
    f += Math.floor((Math.floor((4 * julianDay + 274277) / 146097) * 3) / 4) - 38
  }
  const e = 4 * f + 3
  const h = 5 * Math.floor((e % 1461) / 4) + 2
  const day = Math.floor((h % 153) / 5) + 1
  const month = ((Math.floor(h / 153) + 2) % 12) + 1
  const year = Math.floor(e / 1461) - 4716 + Math.floor((14 - month) / 12)
  return { year: historicalYear(year), month, day }
}

/**
 * The same day, named in the other calendar — the Ides of March, 15 March 44 BC Julian, is 13 March
 * proleptic Gregorian.
 * @param date - the day, in `from`
 * @param from - the calendar it is named in
 * @param to - the calendar to name it in
 * @returns the same day in `to`
 */
export function convertDay(date: CalendarDay, from: Calendar, to: Calendar): CalendarDay {
  return from === to ? { ...date } : calendarDay(julianDayNumber(date, from), to)
}
