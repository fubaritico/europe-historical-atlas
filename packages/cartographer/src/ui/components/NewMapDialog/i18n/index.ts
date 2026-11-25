import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link NEW_MAP_MESSAGES} (CARTO-536). « Annuler » is the shared actions'; a refusal under a field is the
 * persistence's own sentence (`persistence/newMap.ts`).
 *
 * Its messages:
 * - `title` — The dialogue's title and accessible name.
 * - `text` — What « Nouvelle carte » does, every time it opens.
 * - `year`, `yearHint` — The year's field, and the line under it while nothing is refused.
 * - `name`, `nameHint` — The name's field, and the line under it while nothing is refused.
 * - `create`, `creating` — The button, and the button while the map is written.
 */
export type NewMapMessageKey = keyof typeof en

/** {@link NewMapMessageKey}, in French and English, both bundled with the code (`plan.md`, P8). */
export const NEW_MAP_MESSAGES: Catalogue<NewMapMessageKey> = { fr, en }
