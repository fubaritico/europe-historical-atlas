import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link ARRANGE_MESSAGES}: what a stacking command says it did. `move` is the command's own
 * label, from the shared actions catalogue — one label per action — and `name` the polity's, verbatim.
 *
 * Its messages, and the values they take:
 * - `moved` — A move done — the result zone's line, and the history step's name.
 * - `needsPolity` — A stacking key with no polity selected.
 * - `alreadyInPlace` — A polity already at the end it is pushed toward.
 */
export type ArrangeMessageKey = keyof typeof en

/**
 * {@link ArrangeMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const ARRANGE_MESSAGES: Catalogue<ArrangeMessageKey> = { fr, en }
