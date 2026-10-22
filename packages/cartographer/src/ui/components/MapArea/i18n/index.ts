import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link MAP_AREA_MESSAGES}: the map's zone around the canvas — what it says while it waits.
 *
 * Its messages, and the values they take:
 * - `instructions` — What a keyboard reader is told the surface can do. **It names only the keys
 *   `controller.ts` actually binds**, which is what keeps it from going stale.
 * - `preparing` — The waiting line while the backdrop is baked.
 * - `preparingLabel` — The progress bar's name before the first phase is announced.
 * - `phase` — The phase about to run; `phase` is a `ComputePhase`.
 * - `failed`, `failedCost` — The blocking notice when the backdrop could not be baked: its headline, and
 *   what it costs.
 */
export type MapAreaMessageKey = keyof typeof en

/**
 * {@link MapAreaMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const MAP_AREA_MESSAGES: Catalogue<MapAreaMessageKey> = { fr, en }
