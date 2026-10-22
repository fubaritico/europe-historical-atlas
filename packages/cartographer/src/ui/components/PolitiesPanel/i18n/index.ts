import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link POLITIES_PANEL_MESSAGES}. Its commands — new, delete, cancel, close — are the shared
 * actions'. `name` is always a polity's name, verbatim.
 *
 * Its messages, and the values they take:
 * - `title` — The panel's title.
 * - `actionsLabel` — The accessible name of the action bar at the panel's foot.
 * - `deleteNeedsPolity` — The trash's tooltip while nothing is selected.
 * - `deleteQuestion` — The confirmation's question (`s07`): what goes is listed, what does not exist is not
 *   mentioned. `what` is `none`, `rings`, `vassals` or `both`; `rings` and `vassals` are counts.
 * - `deleteResult` — The result zone's line once deleted; `rings` and `vassals` are counts.
 * - `createStep`, `editStep`, `deleteStep` — The history's names for a creation, a change of properties and
 *   a deletion.
 * - `deleteGone` — The polity was gone by the time the author confirmed — an undo in between.
 */
export type PolitiesPanelMessageKey = keyof typeof en

/**
 * {@link PolitiesPanelMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const POLITIES_PANEL_MESSAGES: Catalogue<PolitiesPanelMessageKey> = { fr, en }
