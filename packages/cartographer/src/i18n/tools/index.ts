import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link TOOL_MESSAGES}: the tools' and the Pen's modes' names — the rail's buttons and rows,
 * and what a key that takes a tool says in the status bar. Written once, so the two cannot disagree.
 *
 * Its messages, and the values they take:
 * - `toolName` — A tool's name; `tool` is an `EditorTool`.
 * - `penMode` — A Pen mode's name; `mode` is a `PenMode`.
 * - `modeUnder` — A mode under ⟨retrace⟩, which keeps its own name in front; `tool` and `mode` are names.
 * - `keyName` — A key as the tooltip shows it; `key` is its `KeyboardEvent.key` name.
 */
export type ToolMessageKey = keyof typeof en

/**
 * {@link ToolMessageKey}, in French and English — Illustrator's names, in each language's Illustrator.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const TOOL_MESSAGES: Catalogue<ToolMessageKey> = { fr, en }
