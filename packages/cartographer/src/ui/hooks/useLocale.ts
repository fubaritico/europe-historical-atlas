import { useSyncExternalStore } from 'react'

import { useLocaleStore } from './useLocaleStore'

import type { Locale } from '@europe-historical-atlas/core/i18n/locale'

/**
 * The language of the page (ATLAS-159), followed: when it changes, the component renders again in the new one.
 * **Outside a `LocaleProvider` it throws** ({@link useLocaleStore}).
 * @returns the page's language
 */
export function useLocale(): Locale {
  // Context
  const store = useLocaleStore()

  // Return
  return useSyncExternalStore(store.subscribe, store.get)
}
