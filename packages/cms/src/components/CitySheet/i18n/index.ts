import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A text of the « Ville à une date » screen: a label, the sentence under a field, a refusal.
 *
 * Its messages that take values:
 * - `placeRemove`, `sourceRemove`, `reasonRemove`, `reasonAdded`, `reasonRemoved` — `name`, the place, source or
 *   reason.
 * - `reasonResults` — `count`, how many reasons match.
 * - `removeLine`, `line` — `rank`, the line's rank from 1.
 * - `subjectNamed`, `reasonNamed`, `lineImportanceNamed` — `value`, what is chosen, or the invitation to choose.
 * - `importanceNamed` — `value`, the importance chosen, or the invitation to choose one.
 * - `unexpected` — `detail`, the schema's own wording of an issue the form has no sentence for.
 */
export type CitySheetMessageKey = keyof typeof en

/** {@link CitySheetMessageKey}, in French and English — the admin's language. */
export const CITY_SHEET_MESSAGES: Catalogue<CitySheetMessageKey> = { fr, en }
