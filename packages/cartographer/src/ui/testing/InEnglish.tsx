import { createLocaleStore } from '../../i18n/localeStore'
import { LocaleProvider } from '../components/LocaleProvider'
import { PlatformContext } from '../i18n/platformContext'

import type { ReactNode } from 'react'

/**
 * The language provider, set to English, on a Mac — the wrapper of `renderInEnglish`: the shortcuts are written ⌘ (CARTO-345).
 * @param props - what to wrap
 * @param props.children - the tree under test
 * @returns the tree, in English
 */
export function InEnglish({ children }: { children: ReactNode }) {
  // Render
  return (
    <LocaleProvider store={createLocaleStore('en')}>
      <PlatformContext value="mac">{children}</PlatformContext>
    </LocaleProvider>
  )
}
