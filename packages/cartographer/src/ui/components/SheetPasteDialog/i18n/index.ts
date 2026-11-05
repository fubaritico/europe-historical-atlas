import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link SHEET_PASTE_MESSAGES} (CARTO-345, `s22` « # 3 »). `from` is the copied polity's name, `name` the
 * polity of the map, `map` the map the sheet was copied in, `count` how many fields. The fields' own names are the
 * polity form's (`PolityForm/i18n`), the « Cancel » the shared action's.
 *
 * Its messages, and the values they take:
 * - `title` — The dialogue's title and accessible name: `from`, `name`.
 * - `intro` — What to do: `map`, `name`.
 * - `here`, `copied` — The two columns: the map's value, the copied one.
 * - `paste` — The answer that pastes.
 * - `none`, `yes`, `no` — An empty value, and a pin's two values.
 * - `notOffered` — A suzerain the map does not hold.
 * - `same` — The two sheets are the same: `from`, `name`.
 * - `pasted` — Done: `name`, `count`.
 * - `nothingChosen` — No field ticked.
 * - `nameTaken`, `homage`, `noPolity` — Why nothing was pasted: `name`.
 * - `step` — The history's name of the paste: `name`.
 */
export type SheetPasteMessageKey = keyof typeof en

/** {@link SheetPasteMessageKey}, in French and English, one JSON each, both bundled. */
export const SHEET_PASTE_MESSAGES: Catalogue<SheetPasteMessageKey> = { fr, en }
