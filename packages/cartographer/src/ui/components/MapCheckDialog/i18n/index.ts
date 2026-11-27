import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link MAP_CHECK_MESSAGES} — [Check this year]'s dialogue (CARTO-568).
 *
 * Its messages, and the values they take:
 * - `title` — the dialogue's title and accessible name.
 * - `reading` — while the CMS is read.
 * - `nothing` — no group has a row.
 * - `groups` — the tabs' accessible name.
 * - `toAlign`, `toConfirm`, `toEnter`, `untied` — a group's tab, its count beside it in a badge.
 * - `toAlignHelp`, `toConfirmHelp`, `toEnterHelp`, `untiedHelp` — what a group means and what settles it.
 * - `alignAll` — aligns every row of « different from the CMS ».
 * - `align` — aligns one row to confirm; `alignPolity`, its accessible name, `name` the polity's.
 * - `otherItem` — a polity tied by number whose Wikidata item is not its territory's; `id`, the territory's.
 * - `missingTerritory` — why a polity carrying a number is tied to nothing; `id`, the number.
 * - `dates` — a pair of years; `from`, `to`, each a year or `noDate`.
 * - `noDate` — a year not given.
 * - `dateFields` — the dates the CMS lacks; `fields`, `both`, `existsFrom` or `existsTo`.
 * - `cmsPage` — the link to a territory's page in the CMS.
 * - `openPolity` — a row's accessible name, which opens the polity's form; `name`.
 * - `cmsOffline`, `cmsSignedOut` — the CMS not reached, the session refused.
 * - `cmsRefused` — the CMS's refusal; `reason`, its words.
 * - `alignRefused` — the document refused the alignment.
 * - `alignStep` — the history's name of the gesture; `count`, `name`.
 * - `close` — closes the dialogue.
 */
export type MapCheckMessageKey = keyof typeof en

/** {@link MapCheckMessageKey}, in French and English: one JSON per language, both bundled. */
export const MAP_CHECK_MESSAGES: Catalogue<MapCheckMessageKey> = { fr, en }
