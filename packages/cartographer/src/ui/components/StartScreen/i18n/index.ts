import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link START_SCREEN_MESSAGES} (CARTO-536). « Nouvelle carte… » and « Ouvrir… » are the shared actions'.
 *
 * Its messages, and the values they take:
 * - `welcome` — The screen's heading.
 * - `start` — The accessible name of the column holding « Nouvelle carte… » and « Ouvrir… ».
 * - `home` — The column's one place, Illustrator's « Home »: this screen, marked as the page shown.
 * - `recent` — The heading of the last maps, and the list's accessible name.
 * - `reading`, `failed`, `retry`, `empty` — The list while it is read, when it could not be (with its button), and
 *   when there is no map.
 * - `changed` — When a map was last written; `when` is a worded time (`persistence/timeWords`).
 */
export type StartScreenMessageKey = keyof typeof en

/** {@link StartScreenMessageKey}, in French and English, both bundled with the code (`plan.md`, P8). */
export const START_SCREEN_MESSAGES: Catalogue<StartScreenMessageKey> = { fr, en }
