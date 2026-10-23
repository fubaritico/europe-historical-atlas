import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link PERSISTENCE_MESSAGES}: what opening, saving, the drafts and the snapshots say in the
 * status bar, and how a time is worded (`timeWords`). `year` is given as text; `when` is a worded time.
 *
 * **No technical reason inside a sentence** (the dev, 2026-10-22: *« il ne faut pas qu'il y ait de mélange
 * entre les langues »*): a failure's own words — a server's, a browser's — are English whatever the page, so
 * they go to the console, which already logs every one, and the sentence says the detail is there.
 *
 * Its messages, and the values they take:
 * - `today`, `yesterday`, `onDate`, `unknownTime` — A time
 * - `contents`, `folderHoldsOther`, `readAfterDrawing`, `unreadable`, `neverSaved`, `opened`,
 *   `stillReading`, `saveRunning`, `notSaved`, `saved`, `saveUnconfirmed`, `notSavedChanged` — The year on
 *   disk
 * - `snapshotPageNotKept`, `snapshotPageChanged`, `snapshotNotOpened`, `snapshotOpened` — A snapshot opened
 * - `draftsOffOpening`, `draftsOffStart`, `draftKeptAgain`, `draftNotKept`, `draftUnconfirmed`, `hourlyNotKept`,
 *   `oldDraftLeft`, `draftSetAside`, `draftSetAsideFailed`, `draftUnreadable`, `draftCannotOpen`,
 *   `draftNotResumed`, `draftChangedWhileOffered`, `draftResumed`, `draftNotOffered` — The drafts
 */
export type PersistenceMessageKey = keyof typeof en

/**
 * {@link PersistenceMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const PERSISTENCE_MESSAGES: Catalogue<PersistenceMessageKey> = { fr, en }
