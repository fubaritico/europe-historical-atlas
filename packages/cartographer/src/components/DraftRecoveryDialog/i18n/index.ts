import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link DRAFT_RECOVERY_MESSAGES}. `year` is given as text; `when` is a worded time.
 *
 * Its messages, and the values they take:
 * - `title` — The dialogue's title and accessible name.
 * - `question` — The question.
 * - `setAside`, `resume` — The two answers.
 */
export type DraftRecoveryMessageKey = keyof typeof en

/**
 * {@link DraftRecoveryMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const DRAFT_RECOVERY_MESSAGES: Catalogue<DraftRecoveryMessageKey> = { fr, en }
