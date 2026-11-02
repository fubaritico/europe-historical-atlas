import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link YEAR_DIALOG_MESSAGES}. `year` is given as text.
 *
 * Its messages, and the values they take:
 * - `title` — The dialogue's title and accessible name; the bar's *Open…* without its ellipsis.
 * - `warning` — What it warns, every time it opens.
 * - `reading`, `failed`, `empty` — The list while it is read, when it could not be, and when it is empty.
 * - `legend` — The list's accessible name.
 * - `openYear` — A year's button, `{year}`.
 * - `isOpen` — The open year, shown and not offered, `{year}`.
 */
export type YearDialogMessageKey = keyof typeof en

/** {@link YearDialogMessageKey}, in French and English, both bundled with the code (`plan.md`, P8). */
export const YEAR_DIALOG_MESSAGES: Catalogue<YearDialogMessageKey> = { fr, en }
