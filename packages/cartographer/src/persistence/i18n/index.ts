import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link PERSISTENCE_MESSAGES}: what opening, saving and the automatic save say, and how a time is worded
 * (`timeWords`). `year` is given as text — the map's name since `s19`; `when` is a worded time.
 *
 * **No technical reason inside a sentence** (the dev, 2026-10-22: *« il ne faut pas qu'il y ait de mélange
 * entre les langues »*): a failure's own words — a server's, a browser's — are English whatever the page, so
 * they go to the console, which already logs every one, and the sentence says the detail is there.
 *
 * Its messages, and the values they take:
 * - `today`, `yesterday`, `onDate`, `unknownTime` — A time
 * - `contents`, `folderHoldsOther`, `readAfterDrawing`, `unreadable`, `opened`,
 *   `stillReading`, `saveRunning`, `notSaved`, `notSavedWikidata`, `notSavedPolityField`, `saved`, `saveUnconfirmed`, `notSavedChanged` — The year on
 *   disk
 * - `mapPageChanged`, `saveAsSameName`, `saveAsBadName`, `saveAsOtherYear`, `saveAsTaken`, `saveAsFailed`,
 *   `copySaved`, `copyNotSaved`, `noSuchMap`, `openAskFailed` — A map opened, saved as, copied (`s19`)
 * - `autosaveKeptAgain`, `autosaveNotKept`, `autosaveUnconfirmed` — The automatic save (`autosaveKeeper.ts`)
 */
export type PersistenceMessageKey = keyof typeof en

/**
 * {@link PersistenceMessageKey}, in French and English.
 *
 * One JSON per language, both bundled with the code (`plan.md`, P8: a sentence that says the network
 * failed must not depend on the network); the type above makes a key missing from `fr.json` a compile error.
 */
export const PERSISTENCE_MESSAGES: Catalogue<PersistenceMessageKey> = { fr, en }
