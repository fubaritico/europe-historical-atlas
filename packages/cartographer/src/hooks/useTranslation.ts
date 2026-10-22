import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { useLocale } from './useLocale'

import type { Catalogue, Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A component's messages, in the language of the page (ATLAS-159) — named for what it gives, the dev's call.
 *
 * Each component hands **its own catalogue**, kept in its folder's `i18n/`; an action several menus offer
 * takes its label from the shared actions catalogue, so one action has one label. **No memo**: `core` keeps
 * each translator once made, per catalogue and language, so this is a lookup — and a new one when the
 * language changes (`useLocale`).
 *
 * **Outside a `LocaleProvider` it throws** rather than speaking a default language ({@link useLocale}).
 * @param catalogue - the component's messages, in every language
 * @returns a function building a message by its key
 */
export function useTranslation<Key extends string>(catalogue: Catalogue<Key>): Translate<Key> {
  // Context
  const locale = useLocale()

  // Return
  return createTranslator(catalogue, locale)
}
