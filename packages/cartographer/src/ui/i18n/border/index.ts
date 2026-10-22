import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link BORDER_MESSAGES}: how a border is dressed and named, wherever it is — `{Line}`,
 * `{Overrides}`, the history. `hand` is a stored hand (`solid`, `dotted`…), `auto` for the relation's rule.
 *
 * Its messages, and the values they take:
 * - `handName` — A hand inside a sentence or a row, in lower case.
 * - `handButton` — A hand on its own button.
 * - `stretch` — A stretch: how many segments, and whom it separates (or `orphaned`).
 * - `orphaned` — In place of the names, for a stretch no ring holds any more.
 * - `wholeBorder` — A pair override: the whole border between two polities.
 * - `dressStep` — The history's name for dressing a line: the hand, then what was dressed.
 */
export type BorderMessageKey = keyof typeof en

/**
 * {@link BorderMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const BORDER_MESSAGES: Catalogue<BorderMessageKey> = { fr, en }
