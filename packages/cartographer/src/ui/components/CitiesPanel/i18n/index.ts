import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link CITIES_PANEL_MESSAGES}.
 *
 * Its messages, and the values they take:
 * - `title` — The panel's title.
 * - `allCities` — The row of the list's own eye; `year` is the year open.
 * - `showAll`, `hideAll` — That eye's name, as it would act.
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
 * - `foundCities` — The row of the list's own eye while a filter is typed; `count` is how many cities answer it.
 * - `showFound`, `hideFound` — That eye's name then, as it would act on the cities found.
 * - `noMatch` — Said in place of the list when no city answers the filter; `query` is what was typed.
 */
export type CitiesPanelMessageKey = keyof typeof en

/** {@link CitiesPanelMessageKey}, in French and English, one JSON per language. */
export const CITIES_PANEL_MESSAGES: Catalogue<CitiesPanelMessageKey> = { fr, en }
