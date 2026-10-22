import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link TOOL_RAIL_MESSAGES}. The tools' own names are `state/toolMessages`'.
 *
 * Its messages, and the values they take:
 * - `toolsLabel` — The toolbar's accessible name.
 * - `toolTitle` — A tool's tooltip: its name, then its key.
 * - `groupLabel` — A group's menu, named after the tool heading it; `tool` is its name.
 * - `noTarget`, `noTargetHint` — The swatch with nobody aimed at: its name, and its tooltip saying why it
 *   does nothing.
 * - `colourOf`, `colourHint` — The swatch of the polity aimed at: its name, and its tooltip; `name` is the
 *   polity's.
 */
export type ToolRailMessageKey = keyof typeof en

/**
 * {@link ToolRailMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const TOOL_RAIL_MESSAGES: Catalogue<ToolRailMessageKey> = { fr, en }
