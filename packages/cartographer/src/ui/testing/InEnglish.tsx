import { createLocaleStore } from '../../i18n/localeStore'
import { LocaleProvider } from '../components/LocaleProvider'

import type { ReactNode } from 'react'

/**
 * The language provider, set to English — the wrapper of `renderInEnglish`.
 * @param props - what to wrap
 * @param props.children - the tree under test
 * @returns the tree, in English
 */
export function InEnglish({ children }: { children: ReactNode }) {
  // Render
  return <LocaleProvider store={createLocaleStore('en')}>{children}</LocaleProvider>
}
