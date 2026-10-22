import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link OVERWRITE_MESSAGES}. `year` is given as text; `when` is a worded time, empty when the
 * year is gone from disk (`known` is then `no`). Its « Cancel » is the shared action's.
 *
 * Its messages, and the values they take:
 * - `title` — The dialogue's title and accessible name.
 * - `question` — The question.
 * - `overwrite` — The answer that writes over the year on disk.
 */
export type OverwriteMessageKey = keyof typeof en

/**
 * {@link OverwriteMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const OVERWRITE_MESSAGES: Catalogue<OverwriteMessageKey> = { fr, en }
