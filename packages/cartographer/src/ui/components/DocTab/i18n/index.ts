import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link DOC_TAB_MESSAGES} (CARTO-556).
 *
 * Its messages, and the values they take:
 * - `close` — The close button of a tab; `name` is the map's.
 */
export type DocTabMessageKey = keyof typeof en

/** {@link DocTabMessageKey}, in French and English, both bundled with the code (`plan.md`, P8). */
export const DOC_TAB_MESSAGES: Catalogue<DocTabMessageKey> = { fr, en }
