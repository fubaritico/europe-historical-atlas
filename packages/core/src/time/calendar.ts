/**
 * The two calendars a European date of this project can be written in, and the arithmetic they differ by.
 *
 * **Years here are historical**: `1100`, `-44` for 44 BC, and **no year zero** — 1 BC is followed by AD 1,
 * as historians count. The arithmetic needs the astronomers' count instead, where 1 BC is year `0`;
 * {@link astronomicalYear} is the one place that translates. `Intl` and `Temporal` are of no use: every
 * calendar they ship is proleptic Gregorian, and Europe in 1100 was Julian (`plan.md`, P8).
 */

/**
 * Every calendar, as a value — for a reader to check a field against. **The list is the source of truth and
 * {@link Calendar} is derived from it**, as `ASSET_KINDS` does, so the two cannot drift apart.
 */
export const CALENDARS = ['julian', 'gregorian'] as const

/** The calendar a day-precise date is written in. Gregorian before 1582 is *proleptic*: the rule projected back. */
export type Calendar = (typeof CALENDARS)[number]

/** The days of each month in a common year, January first. */
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

/**
 * The astronomers' year for a historical one: 1 BC is `0`, 2 BC is `-1`.
 * @param year - a historical year, never `0`
 * @returns the same year on the count that has a zero
 */
export function astronomicalYear(year: number): number {
  return year < 0 ? year + 1 : year
}

/**
 * The historical year for an astronomers' one — the inverse of {@link astronomicalYear}.
 * @param year - a year on the count that has a zero
 * @returns the same year as historians write it, never `0`
 */
export function historicalYear(year: number): number {
  return year <= 0 ? year - 1 : year
}

/**
 * Whether a year has a 29 February in a calendar. Julian: every fourth year. Gregorian: every fourth,
 * except the centuries not divisible by 400 — the whole difference between the two.
 * @param year - a historical year, never `0`
 * @param calendar - which rule
 * @returns `true` for a leap year
 */
export function isLeapYear(year: number, calendar: Calendar): boolean {
  const astronomical = astronomicalYear(year)
  const byFour = modulo(astronomical, 4) === 0
  if (calendar === 'julian') return byFour
  return byFour && (modulo(astronomical, 100) !== 0 || modulo(astronomical, 400) === 0)
}

/**
 * How many days a month has, that year, in that calendar.
 * @param year - a historical year, never `0`
 * @param month - 1 for January to 12 for December
 * @param calendar - which leap rule
 * @returns 28 to 31
 */
export function daysInMonth(year: number, month: number, calendar: Calendar): number {
  if (month === 2 && isLeapYear(year, calendar)) return 29
  const days = MONTH_DAYS[month - 1]
  if (days === undefined) throw new RangeError(`month ${String(month)} is not between 1 and 12`)
  return days
}

/**
 * The remainder that stays positive for a negative dividend — `%` gives `-3` for `-43 % 4`, the calendar
 * needs `1`.
 * @param value - the dividend
 * @param divisor - a positive divisor
 * @returns a remainder between 0 and `divisor - 1`
 */
function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}
