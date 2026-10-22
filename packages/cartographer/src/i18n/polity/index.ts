import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link POLITY_MESSAGES}: a polity's vocabulary, shown wherever a polity is — the form, the
 * list. The values are the file's (OHM's); an unknown one is shown as it is stored.
 *
 * Its messages, and the values they take:
 * - `rankName` — A rank's name; `rank` is the stored value.
 * - `statusName` — A standing's name; `status` is the stored value.
 */
export type PolityMessageKey = keyof typeof en

/**
 * {@link PolityMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const POLITY_MESSAGES: Catalogue<PolityMessageKey> = { fr, en }
