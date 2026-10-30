import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message the collections say to the contributor — a refusal at save.
 *
 * Its messages, and the values they take:
 * - `overlap` — A place already has a sheet for the year: `place`, its name; `date`, the saved sheet's date as text.
 * - `invalid` — A sheet the shared schema refuses: `detail`, where and why, in the schema's words.
 */
export type CollectionMessageKey = keyof typeof en

/**
 * {@link CollectionMessageKey}, in French and English — the language the contributor reads the admin in (the dev,
 * 2026-10-30: *« falloir international aussi »*). One JSON per language, as everywhere in the project; the type
 * makes a key missing from `fr.json` a compile error.
 */
export const COLLECTION_MESSAGES: Catalogue<CollectionMessageKey> = { fr, en }
