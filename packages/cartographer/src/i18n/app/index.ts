import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link APP_MESSAGES}: what the composition root names. `year` is given as text.
 *
 * Its messages, and the values they take:
 * - `name` — The application's name, beside the mark — a proper name, the same in both languages.
 * - `heading` — The page's heading, hidden: what a screen reader is told the page is.
 * - `mapLabel` — What a screen reader is told the drawing surface is.
 */
export type AppMessageKey = keyof typeof en

/**
 * {@link AppMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const APP_MESSAGES: Catalogue<AppMessageKey> = { fr, en }
