import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link SNAPSHOT_DIALOG_MESSAGES}. `year` is given as text. Its title is the shared action
 * « Open snapshot… »'s words without the ellipsis; its « Cancel » is the shared action's.
 *
 * Its messages, and the values they take:
 * - `title` — The dialogue's title and accessible name.
 * - `warning` — What it warns, every time it opens.
 * - `open` — The button that opens the snapshot chosen — the dialogue's own, not the bar's *Open…*.
 * - `reading`, `failed`, `empty` — The list while it is read, when it could not be, and when it is empty.
 * - `legend` — The list's accessible name.
 */
export type SnapshotDialogMessageKey = keyof typeof en

/**
 * {@link SnapshotDialogMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const SNAPSHOT_DIALOG_MESSAGES: Catalogue<SnapshotDialogMessageKey> = { fr, en }
