import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link TOOL_RAIL_PANEL_MESSAGES}.
 *
 * Its messages, and the values they take:
 * - `colourStep` — The history's name for a colour chosen from the swatch; `name` is the polity's.
 */
export type ToolRailPanelMessageKey = keyof typeof en

/**
 * {@link ToolRailPanelMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const TOOL_RAIL_PANEL_MESSAGES: Catalogue<ToolRailPanelMessageKey> = { fr, en }
