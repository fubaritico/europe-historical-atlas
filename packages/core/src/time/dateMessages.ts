/**
 * The words a historical date is written with, in each language — the catalogue {@link formatHistoricalDate}
 * reads (ATLAS-159). The calendar is not written: a day is shown as it was dated, Julian for 1066.
 */

import type { Catalogue } from '../i18n/catalogue'

/** The months' keys, January first — `MONTH_KEYS[month - 1]`. */
export const MONTH_KEYS = [
  'month1',
  'month2',
  'month3',
  'month4',
  'month5',
  'month6',
  'month7',
  'month8',
  'month9',
  'month10',
  'month11',
  'month12',
] as const

/** A message of {@link DATE_MESSAGES}. */
export type DateMessageKey =
  | (typeof MONTH_KEYS)[number]
  /** A year before Christ, given as text: "44 av. J.-C.". */
  | 'yearBeforeChrist'
  /** A month and its year, both given as text. */
  | 'monthYear'
  /** A day, its month and its year, all given as text — French writes the first "1er". */
  | 'dayMonthYear'
  /** An approximate date, given as text: "vers 1100". */
  | 'circa'
  /** Two bare years: "1337–1453". */
  | 'interval'
  /** Two ends with words in them, the dash spaced so it reads between them: "vers 1100 – 1150". */
  | 'intervalSpaced'

/** {@link DateMessageKey}, in French and English. */
export const DATE_MESSAGES: Catalogue<DateMessageKey> = {
  fr: {
    month1: 'janvier',
    month2: 'février',
    month3: 'mars',
    month4: 'avril',
    month5: 'mai',
    month6: 'juin',
    month7: 'juillet',
    month8: 'août',
    month9: 'septembre',
    month10: 'octobre',
    month11: 'novembre',
    month12: 'décembre',
    yearBeforeChrist: '{year} av. J.-C.',
    monthYear: '{month} {year}',
    dayMonthYear: '{day, select, 1 {1er} other {{day}}} {month} {year}',
    circa: 'vers {date}',
    interval: '{from}–{to}',
    intervalSpaced: '{from} – {to}',
  },
  en: {
    month1: 'January',
    month2: 'February',
    month3: 'March',
    month4: 'April',
    month5: 'May',
    month6: 'June',
    month7: 'July',
    month8: 'August',
    month9: 'September',
    month10: 'October',
    month11: 'November',
    month12: 'December',
    yearBeforeChrist: '{year} BC',
    monthYear: '{month} {year}',
    dayMonthYear: '{day} {month} {year}',
    circa: 'c. {date}',
    interval: '{from}–{to}',
    intervalSpaced: '{from} – {to}',
  },
}
