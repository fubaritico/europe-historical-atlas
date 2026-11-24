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
 * - `territory`, `territoryHelp`, `territoryPlaceholder`, `territoryList`, `noTerritoryMatch`, `noTerritories` — The
 *   CMS territory a polity is tied to (CARTO-450): its label, its help, its search and what it says when there is none.
 * - `removeTerritory` — The cross beside the territory held; `name` is its label.
 * - `territoryLabel` — A territory in the list; `name` its name, `id` its number in the CMS.
 * - `territoryProposals`, `proposalField`, `proposalVerb`, `proposalLabel` — What the CMS's territory proposes under
 *   « Territoire du CMS » (CARTO-488): the list's name; a field's name (`field`); the button's verb by `state` — `empty`,
 *   `differs`, else agreed; and the button's full name, `verb`, `value` and `field`.
 * - `rankWarning` — A vassal ranking higher than its suzerain (CORE-489), under the suzerain: `vassal` and `suzerain`
 *   their names, `vassalRank` and `suzerainRank` their ranks, named.
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
