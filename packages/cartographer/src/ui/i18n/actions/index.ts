import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link ACTION_MESSAGES}: an action the author can take from more than one place — a bar, a
 * contextual menu, a dialogue, the future menu bar (CARTO-239). **One action, one label**, the dev's
 * objection of 2026-10-21: the same command never reads two ways in two menus.
 *
 * Its messages, and the values they take:
 * - `save` — Write the map to disk.
 * - `open` — Open a map.
 * - `saveAs` — Write the map under another name, and go on as the new map.
 * - `saveCopy` — Write a copy of the map, and stay on it.
 * - `yes`, `no` — The answers to a question — *Open…*'s « save the current map? ».
 * - `undo` — Undo, with nothing to undo — the bare verb.
 * - `redo` — Redo, with nothing to redo — the bare verb.
 * - `undoStep` — Undo a named step; `step` is the history's name for it.
 * - `redoStep` — Redo a named step; `step` is the history's name for it.
 * - `newPolity` — Create a polity.
 * - `editProperties` — Open the chosen polity's dialogue — the contextual menu's first item (`s07`).
 * - `deletePolity` — Delete the chosen polity.
 * - `close` — Close a dialogue or a menu.
 * - `ok` — Accept a dialogue's form — its submit button.
 * - `cancel` — Leave a dialogue without doing what it offered.
 * - `delete` — Confirm a deletion — the dialogue's own button, its subject already named.
 * - `front`, `forward`, `backward`, `back` — The four stacking commands — Illustrator's own names, in each
 *   language's Illustrator.
 * - `menuFile`, `menuEdit` — The menu bar's two menus (CARTO-345).
 * - `copy` — Copy the polity or the stretch selected.
 * - `pastePolities` — Paste the polities copied, each whole, in place.
 * - `pasteStretch`, `pasteSheet` — Paste onto a polity; `name` is the polity selected, verbatim, or
 *   `theSelection` when none is.
 * - `theSelection` — What a paste onto a polity names when no polity is selected.
 */
export type ActionMessageKey = keyof typeof en

/**
 * {@link ActionMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const ACTION_MESSAGES: Catalogue<ActionMessageKey> = { fr, en }
