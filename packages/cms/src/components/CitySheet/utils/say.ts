import type { CitySheetMessageKey } from '../i18n'
import type { MessageValues } from '@europe-historical-atlas/core/i18n/messageFormat'

/** The screen's translator, in the admin's language: a key, and the values its message names. */
export type Say = (key: CitySheetMessageKey, values?: MessageValues) => string
