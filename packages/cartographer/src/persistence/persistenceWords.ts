import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { PERSISTENCE_MESSAGES } from './i18n'

import type { PersistenceMessageKey } from './i18n'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'
import type { Locale } from '@europe-historical-atlas/core/i18n/locale'

/**
 * What the year on disk says, in the page's language (ATLAS-159): its sentences, and the language a date is
 * written in. **Injected** into each session, never read from the page.
 */
export interface PersistenceWords {
  /** The sentences. */
  t: Translate<PersistenceMessageKey>
  /** The page's language — the order and the names of a date. */
  locale: Locale
}

/**
 * The year on disk's words in one language.
 * @param locale - the page's language
 * @returns the words
 */
export function persistenceWords(locale: Locale): PersistenceWords {
  return { t: createTranslator(PERSISTENCE_MESSAGES, locale), locale }
}
