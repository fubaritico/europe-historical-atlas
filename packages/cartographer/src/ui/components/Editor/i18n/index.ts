import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link EDITOR_MESSAGES}: the two top bars and the shell. Their commands — open, save, undo,
 * redo, close — are the shared actions'; this holds what is said around them.
 *
 * Its messages, and the values they take:
 * - `notBuilt` — Why a button does nothing yet; `scenarios` names the scenarios that will build it.
 * - `openHint`, `saveHint`, `saveAsHint`, `saveCopyHint` — The tooltips of *Open…*, *Save*, *Save as…* and *Save a
 *   copy* (`s19`); `keys`, the first three's shortcut as the system writes it (CARTO-345).
 * - `closeYear` — Close the open year; `close` is the shared action's label, `year` the year as text.
 * - `nothingToUndo`, `nothingToRedo` — Why undo or redo is unavailable.
 * - `undoHint`, `redoHint` — The tooltip of undo and redo; `label` is the button's name, `keys` its shortcut.
 * - `checkYear` — Check the year — a command not built yet.
 * - `menuBar` — The menu bar's accessible name (CARTO-345).
 * - `placeholder` — The shell's placeholders, where a zone is not given; `zone` is `appBar`, `docBar`,
 *   `tools` or `panels`.
 * - `signOut`, `signedInAs`, `signInFirst`, `sessionExpired` — The session (CARTO-535): the button, who is signed in
 *   (`email`), why the bar's gestures are greyed, and the expired session's dialogue's name.
 * - `openMapFirst` — Why the three saves are greyed on the start screen (CARTO-536).
 */
export type EditorMessageKey = keyof typeof en

/**
 * {@link EditorMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const EDITOR_MESSAGES: Catalogue<EditorMessageKey> = { fr, en }
