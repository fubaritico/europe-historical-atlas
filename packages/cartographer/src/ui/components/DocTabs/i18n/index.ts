import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link DOC_TABS_MESSAGES} (CARTO-556).
 *
 * Its messages:
 * - `tabs` — The accessible name of the list of tabs, the maps open.
 */
export type DocTabsMessageKey = keyof typeof en

/** {@link DocTabsMessageKey}, in French and English, both bundled with the code (`plan.md`, P8). */
export const DOC_TABS_MESSAGES: Catalogue<DocTabsMessageKey> = { fr, en }
