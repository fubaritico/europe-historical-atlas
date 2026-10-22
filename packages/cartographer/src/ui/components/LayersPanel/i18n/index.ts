import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link LAYERS_PANEL_MESSAGES}. `layer` is a layer's name, from `layerName`.
 *
 * Its messages, and the values they take:
 * - `title` — The panel's title.
 * - `layerName` — A layer's name; `id` is one of `LAYER_IDS`.
 * - `hide` — The eye of a layer shown.
 * - `show` — The eye of a layer hidden.
 * - `opacity` — The accessible name of a layer's opacity slider.
 */
export type LayersPanelMessageKey = keyof typeof en

/**
 * {@link LayersPanelMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const LAYERS_PANEL_MESSAGES: Catalogue<LayersPanelMessageKey> = { fr, en }
