import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link POLITY_FORM_MESSAGES}. Its buttons — cancel, close — are the shared actions'.
 *
 * Its messages, and the values they take:
 * - `editTitle` — The title when editing a polity; creating one is titled by the shared action « New polity
 *   ».
 * - `name`, `shortName`, `id`, `rank`, `status`, `existsFrom`, `existsTo`, `suzerain`, `colour`, `wikidata` — The
 *   fields' labels, in `s02`'s order.
 * - `shortNameHint` — What the short name is for, under its field (CARTO-307).
 * - `stillExists` — The end year's placeholder — empty means it still exists.
 * - `none` — The choice standing for no value in a list, and for no suzerain.
 * - `suzerainPlaceholder`, `suzerainList`, `noSuzerainMatch` — The suzerain search: its placeholder, its
 *   list's name, and what it says when nothing matches.
 * - `removeSuzerain` — The cross beside the suzerain held; `name` is its name.
 * - `nameMissing`, `idMissing`, `idTaken`, `notAYear` — Why a field is refused — `polityDraft`'s
 *   `DraftError`.
 */
export type PolityFormMessageKey = keyof typeof en

/**
 * {@link PolityFormMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const POLITY_FORM_MESSAGES: Catalogue<PolityFormMessageKey> = { fr, en }
