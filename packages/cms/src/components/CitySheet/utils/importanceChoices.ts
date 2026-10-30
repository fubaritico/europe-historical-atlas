import { CITY_IMPORTANCES } from '@europe-historical-atlas/core/data/cityImportance'

import type { CitySheetMessageKey } from '../i18n'
import type { Choice } from './choice'
import type { Say } from './say'
import type { CityImportance } from '@europe-historical-atlas/core/data/cityImportance'

/** Each importance's label in the screen's texts. */
const LABEL_KEYS: Readonly<Record<CityImportance, CitySheetMessageKey>> = {
  capital: 'capital',
  'large-city': 'largeCity',
  city: 'city',
}

/**
 * The three importances as a list's choices — the sheet's own and a line's.
 * @param say - the translator
 * @returns the choices, from the capital down
 */
export function importanceChoices(say: Say): Choice[] {
  return CITY_IMPORTANCES.map((value) => ({ value, label: say(LABEL_KEYS[value]) }))
}
