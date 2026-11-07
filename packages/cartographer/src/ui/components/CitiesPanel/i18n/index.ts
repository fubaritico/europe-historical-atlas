import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link CITIES_PANEL_MESSAGES}.
 *
 * Its messages, and the values they take:
 * - `title` — The panel's title.
 * - `showAll` — The box heading the list, every city of the year shown; `year` is the year open.
 * - `asPoints` — The second box: the cities shown drawn as points in their holder's colour (2026-11-05).
 * - `show`, `hide` — A city's eye; `city` is its name.
 * - `loading` — While the export is read.
 * - `failed` — The export could not be read; `reason` is what went wrong.
 * - `none` — No city of the export covers the year open; `year` is that year.
 * - `hint` — Under the list: what a double-click does.
 * - `onMap` — The polity the map has under the city; `polity` is its name.
 * - `unclaimed` — The map has no polity under the city.
 * - `bySources` — The holder the sources give (CMS-335); `polity` is its name.
 * - `notEntered` — Nobody has entered the holder yet.
 * - `agrees`, `misplaced`, `toDeclare`, `cannotCompare` — The verdict of the comparison by Wikidata id; `polity` is the
 *   sources' holder.
 * - `source`, `sourceWhere` — A source saying who held it; `title` is its title, `where` where in it.
 * - `closeDetail` — The button that closes a city's detail.
 * - `filter` — The filter field's accessible name (CARTO-360).
 * - `showFound` — That box while a filter is typed; `count` is how many cities answer it.
 * - `noMatch` — Said in place of the list when no city answers the filter; `query` is what was typed.
 * - `noMatchFilters` — The same, when nothing is typed and the advanced filters let no city through (CARTO-370).
 * - `filters` — The funnel's name and the advanced filters' title.
 * - `filtersOn` — The funnel's name while holders or states are ticked; `count` is how many, both kinds together.
 * - `byState`, `byStateHint` — The section of the states (CARTO-369), and what ticking one does.
 * - `stateMisplaced`, `stateToDeclare`, `stateCannotCompare`, `stateAgrees` — A state's box; `count` is how many cities
 *   of the year are in it.
 * - `byHolder`, `byHolderHint` — The section of the map's polities, and what ticking one does.
 * - `holderCount` — A box: `name` is the holder's, `count` how many cities of the year the sources give it.
 * - `noWikidata` — A polity of the map without a Wikidata id, greyed; `name` is its name.
 * - `offMap`, `offMapHint` — The section of the holders no polity of the map carries.
 * - `noHolder` — The box of the cities nobody has entered a holder for; `count` is how many.
 * - `untickAll`, `closeFilters` — The dialogue's two buttons.
 * - `filterHolders` — The filter field at the head of the dialogue: its accessible name.
 * - `noHolderMatch` — Said in a section when no country of it answers the filter; `query` is what was typed.
 * - `dotHolder`, `dotVassal`, `dotOffMap`, `dotNotEntered` — The bubble over a row's dot (CARTO-367): `name` is the
 *   holder's, `suzerain` its direct suzerain's in the map's registry; `noWikidata` serves a holder without an id.
 */
export type CitiesPanelMessageKey = keyof typeof en

/** {@link CitiesPanelMessageKey}, in French and English, one JSON per language. */
export const CITIES_PANEL_MESSAGES: Catalogue<CitiesPanelMessageKey> = { fr, en }
