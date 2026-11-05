import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link LIST_FILTER_MESSAGES}.
 *
 * Its messages:
 * - `placeholder` — Written in the empty field.
 */
export type ListFilterMessageKey = keyof typeof en

/** {@link ListFilterMessageKey}, in French and English, one JSON per language. */
export const LIST_FILTER_MESSAGES: Catalogue<ListFilterMessageKey> = { fr, en }
