import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link WIKIDATA_PANEL_MESSAGES}. `id` is a Wikidata id, `Q…`; `year` is given as text.
 *
 * Its messages, and the values they take:
 * - `reading` — The reading is under way.
 * - `failed` — Wikidata did not answer — the browser's own words are in the console, English whatever the
 *   page.
 * - `unknown` — Wikidata has no such item.
 * - `notASubject` — The item is a page about Wikipedia itself; `kind` is `category`, `disambiguation` or
 *   `list`.
 * - `anachronism` — The year edited lies outside the item's dates; `when` is `notYet` or `noLonger`.
 * - `vassalState` — Beside the item's name, when it calls itself a vassal state.
 * - `proposals` — The accessible name of the list of suggestions.
 * - `fieldName` — A field Wikidata can fill; `field` is `name`, `existsFrom`, `existsTo` or `suzerain`.
 * - `verb` — A suggestion's button; `state` is `empty`, `differs` or `same`.
 * - `suggestionLabel` — A suggestion button's accessible name: the verb, the value and the field.
 */
export type WikidataPanelMessageKey = keyof typeof en

/**
 * {@link WikidataPanelMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const WIKIDATA_PANEL_MESSAGES: Catalogue<WikidataPanelMessageKey> = { fr, en }
