import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link SAVE_FIRST_MESSAGES}. `map` is the name of the map about to be opened. Its « Yes » and « No » are
 * the shared actions'.
 *
 * Its messages, and the values they take:
 * - `title` — The dialogue's title and accessible name.
 * - `question` — The question, the dev's words (`s19`).
 */
export type SaveFirstMessageKey = keyof typeof en

/** {@link SaveFirstMessageKey}, in French and English, both bundled with the code (`plan.md`, P8). */
export const SAVE_FIRST_MESSAGES: Catalogue<SaveFirstMessageKey> = { fr, en }
