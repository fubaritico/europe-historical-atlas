import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link POLITY_LIST_MESSAGES}. A row's rank is worded by the shared polity vocabulary (`polityMessages`).
 *
 * Its messages, and the values they take:
 * - `label` — The list's accessible name.
 * - `drawnAt` — The subhead; `year` is given as text.
 * - `vassalOf` — Hidden, after a vassal's name — the tree's hierarchy for assistive tech; `name` is its
 *   suzerain's.
 * - `noTerritory` — The chip of a polity with nothing drawn.
 * - `empty` — Said in place of the list when the year holds no polity.
 */
export type PolityListMessageKey = keyof typeof en

/**
 * {@link PolityListMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const POLITY_LIST_MESSAGES: Catalogue<PolityListMessageKey> = { fr, en }
