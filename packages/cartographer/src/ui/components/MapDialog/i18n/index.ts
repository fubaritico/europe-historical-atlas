import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link MAP_DIALOG_MESSAGES}. `map` is a map's name.
 *
 * Its messages, and the values they take:
 * - `title` — The dialogue's title and accessible name; the bar's *Open…* without its ellipsis.
 * - `warning` — What it warns, every time it opens.
 * - `reading`, `failed`, `empty` — The list while it is read, when it could not be, and when it is empty.
 * - `legend` — The list's accessible name.
 * - `isOpen` — The mark beside the open map, which is shown and not offered.
 * - `autosave` — What an automatic save's icon stands for, said to a screen reader.
 * - `open` — The button that opens the map selected — the bar's *Open…* without its ellipsis.
 */
export type MapDialogMessageKey = keyof typeof en

/** {@link MapDialogMessageKey}, in French and English, both bundled with the code (`plan.md`, P8). */
export const MAP_DIALOG_MESSAGES: Catalogue<MapDialogMessageKey> = { fr, en }
