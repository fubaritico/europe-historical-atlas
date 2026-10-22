import { use } from 'react'

import { LocaleContext } from '../i18n/localeContext'

import type { LocaleStore } from '../i18n/localeStore'

/**
 * The language store above — for a part that reads the language when it speaks rather than when it renders:
 * the canvas, mounted once, asks it at each sentence (ATLAS-159).
 *
 * **Outside a `LocaleProvider` it throws** rather than speaking a default language: a component with no
 * language above it is a wiring fault, and a silent English would hide it (`rules/error-handling.md`).
 * @returns the store
 */
export function useLocaleStore(): LocaleStore {
  // Context
  const store = use(LocaleContext)

  // Guards
  if (store === null) {
    throw new Error('Cartographer: no language in context — provide LocaleProvider at the root.')
  }

  // Return
  return store
}
