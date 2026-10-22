import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link POLITY_STACK_MENU_MESSAGES}; its commands are the shared actions'.
 *
 * Its messages, and the values they take:
 * - `menuLabel` — The menu's accessible name; `name` is the polity's, verbatim.
 */
export type PolityStackMenuMessageKey = keyof typeof en

/**
 * {@link PolityStackMenuMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const POLITY_STACK_MENU_MESSAGES: Catalogue<PolityStackMenuMessageKey> = { fr, en }
