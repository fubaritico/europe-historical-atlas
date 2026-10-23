import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link ALARM_MESSAGES}. Its « OK » is the shared action's.
 *
 * Its messages, and the values they take:
 * - `title` — The dialogue's title and accessible name, after the topic of its newest alarm (`topic`).
 */
export type AlarmMessageKey = keyof typeof en

/** {@link AlarmMessageKey}, in French and English — one JSON per language, both bundled (`plan.md`, P8). */
export const ALARM_MESSAGES: Catalogue<AlarmMessageKey> = { fr, en }
