/**
 * A historical date as text — "1100", "vers 1100", "1337–1453", "14 octobre 1066", "44 av. J.-C.".
 *
 * Text, never `Intl.DateTimeFormat`: it would print a proleptic Gregorian day and has no "circa" (`plan.md`,
 * P8). Two languages, because the atlas speaks French and English and the Cartographer English (decided
 * 2026-10-08). The calendar is not printed: a day is shown as it was written, Julian for 1066.
 */

import type { HistoricalDate, HistoricalMoment } from './historicalDate'

/** A language a date can be written in. */
export type DateLocale = 'fr' | 'en'

/** What each language needs to write a date. */
interface DateWords {
  /** January to December. */
  months: readonly string[]
  /** Before a circa year: "vers 1100", "c. 1100". */
  circa: string
  /** After a year before Christ: "44 av. J.-C.", "44 BC". */
  beforeChrist: string
  /** How the day of the month is written — French writes the first "1er". */
  day: (day: number) => string
}

/** Each language's words. */
const WORDS: Record<DateLocale, DateWords> = {
  fr: {
    months: [
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ],
    circa: 'vers',
    beforeChrist: 'av. J.-C.',
    day: (day) => (day === 1 ? '1er' : String(day)),
  },
  en: {
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    circa: 'c.',
    beforeChrist: 'BC',
    day: (day) => String(day),
  },
}

/**
 * A date as a reader sees it.
 *
 * An interval of two bare years takes a closed en dash, "1337–1453"; as soon as one end has words in it,
 * the dash is spaced so it reads between the ends and not inside one: "vers 1100 – 1150".
 * @param date - a date, as {@link readHistoricalDate} answers it
 * @param locale - the language to write it in
 * @returns the text
 */
export function formatHistoricalDate(date: HistoricalDate, locale: DateLocale): string {
  if (date.kind === 'instant') return formatMoment(date.at, locale)
  const from = formatMoment(date.from, locale)
  const to = formatMoment(date.to, locale)
  return from.includes(' ') || to.includes(' ') ? `${from} – ${to}` : `${from}–${to}`
}

/**
 * One end: circa, then the day and month when known, then the year.
 * @param moment - the end
 * @param locale - the language
 * @returns its text
 */
function formatMoment(moment: HistoricalMoment, locale: DateLocale): string {
  const words = WORDS[locale]
  const year =
    moment.year < 0 ? `${String(-moment.year)} ${words.beforeChrist}` : String(moment.year)
  const month = moment.month === null ? undefined : words.months[moment.month - 1]
  // `readHistoricalDate` refuses both; a date built by hand must not lose its month or its day in silence.
  if (moment.month !== null && month === undefined) {
    throw new RangeError(`month ${String(moment.month)} is not between 1 and 12`)
  }
  if (moment.day !== null && moment.month === null) {
    throw new RangeError(`day ${String(moment.day)} has no month`)
  }
  const parts = [
    moment.circa ? words.circa : undefined,
    month !== undefined && moment.day !== null ? words.day(moment.day) : undefined,
    month,
    year,
  ]
  return parts.filter((part) => part !== undefined).join(' ')
}
