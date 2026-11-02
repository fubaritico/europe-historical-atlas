import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link SAVE_AS_MESSAGES}. Its « Save » and « Cancel » are the shared actions'; a refusal under the field
 * is the session's own sentence (`persistence/yearSession.ts`).
 *
 * Its messages:
 * - `title` — The dialogue's title and accessible name.
 * - `text` — What *Save as…* does, every time it opens.
 * - `name`, `hint` — The field's label, and the line under it while nothing is refused.
 * - `saving` — The button while the save runs.
 */
export type SaveAsMessageKey = keyof typeof en

/** {@link SaveAsMessageKey}, in French and English, both bundled with the code (`plan.md`, P8). */
export const SAVE_AS_MESSAGES: Catalogue<SaveAsMessageKey> = { fr, en }
