import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link OVERRIDES_PANEL_MESSAGES}. What each override dresses is worded by the shared border vocabulary (`borderMessages`).
 *
 * Its messages, and the values they take:
 * - `title` — The panel's title, and the list's accessible name.
 * - `empty` — Said in place of the list when nothing is overridden.
 * - `fact` — In place of a hand, for an override that states only a fact.
 * - `clear` — The button that removes an override.
 * - `clearLabel` — That button's accessible name; `hand` is the hand's name or `fact`, `what` the row.
 * - `clearStep` — The history's name for clearing; `what` is the row.
 */
export type OverridesPanelMessageKey = keyof typeof en

/**
 * {@link OverridesPanelMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const OVERRIDES_PANEL_MESSAGES: Catalogue<OverridesPanelMessageKey> = { fr, en }
