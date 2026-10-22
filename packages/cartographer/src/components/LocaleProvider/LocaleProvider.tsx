import { LocaleContext } from '../../i18n/localeContext'

import type { LocaleStore } from '../../i18n/localeStore'
import type { ReactNode } from 'react'

/** What the provider needs. */
export interface LocaleProviderProps {
  /** The language store — built at the composition root, the one the canvas and the year on disk read too. */
  store: LocaleStore
  /** The application. */
  children: ReactNode
}

/**
 * Make the page's language reach every component below (ATLAS-159), and follow it when it changes.
 * @param props - the store and the tree
 * @param props.store - the language store
 * @param props.children - the tree that speaks it
 * @returns the tree, with its language
 */
export function LocaleProvider({ store, children }: LocaleProviderProps) {
  // Render
  return <LocaleContext value={store}>{children}</LocaleContext>
}
