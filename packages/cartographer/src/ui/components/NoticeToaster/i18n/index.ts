import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link NOTICE_TOASTER_MESSAGES}. Its close buttons' word is the shared action's « Close ».
 *
 * Its messages, and the values they take:
 * - `label` — The stack's accessible name; the design system appends its key, « (F8) ».
 */
export type NoticeToasterMessageKey = keyof typeof en

/** {@link NoticeToasterMessageKey}, in French and English — one JSON per language, both bundled (`plan.md`, P8). */
export const NOTICE_TOASTER_MESSAGES: Catalogue<NoticeToasterMessageKey> = { fr, en }
