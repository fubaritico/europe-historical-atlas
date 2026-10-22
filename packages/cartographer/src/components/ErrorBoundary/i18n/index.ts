import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link ERROR_BOUNDARY_MESSAGES}.
 *
 * Its messages, and the values they take:
 * - `failed` — The headline shown in place of a zone that failed.
 * - `retry` — The button that remounts the zone, where the zone allows it.
 */
export type ErrorBoundaryMessageKey = keyof typeof en

/**
 * What a failed zone says, in French and English. Its « Close » is the shared action's (`actionMessages`).
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const ERROR_BOUNDARY_MESSAGES: Catalogue<ErrorBoundaryMessageKey> = { fr, en }
