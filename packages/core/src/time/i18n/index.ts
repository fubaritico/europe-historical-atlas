import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '../../i18n/catalogue'

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

/**
 * A message of {@link DATE_MESSAGES}.
 *
 * Its messages, and the values they take:
 * - `yearBeforeChrist` — A year before Christ, given as text: "44 av. J.-C.".
 * - `monthYear` — A month and its year, both given as text.
 * - `dayMonthYear` — A day, its month and its year, all given as text — French writes the first "1er".
 * - `circa` — An approximate date, given as text: "vers 1100".
 * - `interval` — Two bare years: "1337–1453".
 * - `intervalSpaced` — Two ends with words in them, the dash spaced so it reads between them: "vers 1100 –
 *   1150".
 */
export type DateMessageKey = keyof typeof en

/**
 * {@link DateMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const DATE_MESSAGES: Catalogue<DateMessageKey> = { fr, en }
