import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link ATLAS_MESSAGES}.
 *
 * Its messages, and the values they take:
 * - `loadingYear` — The progress caption while a year loads; `year` is given as text.
 * - `phaseRasterise`, `phaseExpand`, `phaseColours`, `phaseCut`, `phaseBake`, `phaseBorders`, `phaseNames` — The progress
 *   caption of each compute phase.
 * - `phaseTerrain`, `phaseRelief` — The startup's captions before the year: the relief and the mask downloaded, then the
 *   relief raised with the sheet and its decor (ATLAS-333).
 * - `phaseEvents` — The progress caption while the startup places the events, last before the splash goes.
 * - `heightmapFailed`, `landMaskFailed`, `regionsFailed`, `riversFailed`, `yearRegistryFailed`,
 *   `yearPolitiesFailed`, `yearBordersFailed` — What failed, per asset, with a case per `failure`:
 *   transport, schema, consistency, semantic, other.
 * - `heightmapLoss`, `landMaskLoss`, `regionsLoss`, `riversLoss`, `yearRegistryLoss`, `yearPolitiesLoss`,
 *   `yearBordersLoss` — What the reader loses, per asset.
 * - `assetNotice` — A failure's headline: what failed, then what it costs.
 * - `unexpectedError` — The headline of an error nothing anticipated.
 * - `dismiss` — The accessible name of a notice's close button.
 * - `yearSwitchLabel` — The accessible name of the temporary row of year buttons (ATLAS-333).
 */
export type AtlasMessageKey = keyof typeof en

/**
 * {@link AtlasMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const ATLAS_MESSAGES: Catalogue<AtlasMessageKey> = { fr, en }
