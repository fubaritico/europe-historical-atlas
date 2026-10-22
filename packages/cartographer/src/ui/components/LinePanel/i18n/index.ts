import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link LINE_PANEL_MESSAGES}. The hands and what is selected are worded by the shared border vocabulary (`borderMessages`).
 *
 * Its messages, and the values they take:
 * - `title` — The panel's title.
 * - `hint` — Said while no stretch is selected.
 * - `scope` — The accessible name of the choice between the stretch and the whole border.
 * - `thisStretch` — Dress only the stretch selected.
 * - `wholeBorder` — Dress the whole border with the neighbour.
 * - `borderUnavailable` — Why the whole border cannot be chosen.
 * - `patterns` — The accessible name of the row of patterns.
 */
export type LinePanelMessageKey = keyof typeof en

/**
 * {@link LinePanelMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const LINE_PANEL_MESSAGES: Catalogue<LinePanelMessageKey> = { fr, en }
