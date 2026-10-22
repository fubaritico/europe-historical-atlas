/**
 * A historical date as text — "1100", "vers 1100", "1337–1453", "14 octobre 1066", "44 av. J.-C.".
 *
 * Text, never `Intl.DateTimeFormat`: it would print a proleptic Gregorian day and has no "circa" (`plan.md`,
 * P8). The words are a catalogue, `dateMessages.ts`, built by `core`'s ICU engine (ATLAS-159). The calendar
 * is not printed: a day is shown as it was written, Julian for 1066.
 */

import { createTranslator } from '../i18n/catalogue'

import { DATE_MESSAGES, MONTH_KEYS } from './i18n'

import type { HistoricalDate, HistoricalMoment } from './historicalDate'
import type { DateMessageKey } from './i18n'
import type { Translate } from '../i18n/catalogue'
import type { Locale } from '../i18n/locale'

/** One translator per language, made once: a malformed message fails when this module loads. */
const TRANSLATORS: Readonly<Record<Locale, Translate<DateMessageKey>>> = {
  fr: createTranslator(DATE_MESSAGES, 'fr'),
  en: createTranslator(DATE_MESSAGES, 'en'),
}

/**
 * A date as a reader sees it.
 *
 * An interval of two bare years takes a closed en dash, "1337–1453"; as soon as one end has words in it — a
 * circa, a month, an era — the dash is spaced so it reads between the ends and not inside one:
 * "vers 1100 – 1150". Decided from the dates, never from the translated text.
 * @param date - a date, as {@link readHistoricalDate} answers it
 * @param locale - the language to write it in
 * @returns the text
 */
export function formatHistoricalDate(date: HistoricalDate, locale: Locale): string {
  const translate = TRANSLATORS[locale]
  if (date.kind === 'instant') return formatMoment(date.at, translate)
  const from = formatMoment(date.from, translate)
  const to = formatMoment(date.to, translate)
  const spaced = !isBareYear(date.from) || !isBareYear(date.to)
  return translate(spaced ? 'intervalSpaced' : 'interval', { from, to })
}

/**
 * Whether an end is written as a number alone: a year after Christ, not circa, with no month.
 * @param moment - the end
 * @returns `true` for "1337", `false` for "vers 1100", "mars 1100" or "44 av. J.-C."
 */
function isBareYear(moment: HistoricalMoment): boolean {
  return !moment.circa && moment.month === null && moment.year > 0
}

/**
 * One end: its year, with its month and day when known, then "circa" around it.
 * @param moment - the end
 * @param translate - the language's messages
 * @returns its text
 */
function formatMoment(moment: HistoricalMoment, translate: Translate<DateMessageKey>): string {
  const year =
    moment.year < 0
      ? translate('yearBeforeChrist', { year: String(-moment.year) })
      : String(moment.year)
  const text = withMonth(moment, year, translate)
  return moment.circa ? translate('circa', { date: text }) : text
}

/**
 * The year alone, or with its month, or with its day and month.
 * @param moment - the end
 * @param year - its year, already written
 * @param translate - the language's messages
 * @returns the text
 */
function withMonth(
  moment: HistoricalMoment,
  year: string,
  translate: Translate<DateMessageKey>
): string {
  // `readHistoricalDate` refuses both; a date built by hand must not lose its month or its day in silence.
  if (moment.day !== null && moment.month === null) {
    throw new RangeError(`day ${String(moment.day)} has no month`)
  }
  if (moment.month === null) return year
  const monthKey = MONTH_KEYS[moment.month - 1]
  if (monthKey === undefined) {
    throw new RangeError(`month ${String(moment.month)} is not between 1 and 12`)
  }
  const month = translate(monthKey)
  if (moment.day === null) return translate('monthYear', { month, year })
  return translate('dayMonthYear', { day: String(moment.day), month, year })
}
