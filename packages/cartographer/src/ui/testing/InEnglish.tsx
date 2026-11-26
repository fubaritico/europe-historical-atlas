import { createLocaleStore } from '../../i18n/localeStore'
import { ChromeContexts } from '../components/ChromeContexts'
import { LocaleProvider } from '../components/LocaleProvider'

import type { ReactNode } from 'react'

/**
 * The language provider, set to English, on a Mac — the wrapper of `renderInEnglish`: the shortcuts are written ⌘ (CARTO-345).
 * The CMS's channel is the online one, where the chrome writes no CMS (CARTO-498): a test of « Ajouter au CMS » provides
 * its own.
 * @param props - what to wrap
 * @param props.children - the tree under test
 * @returns the tree, in English
 */
export function InEnglish({ children }: { children: ReactNode }) {
  // Render
  return (
    <LocaleProvider store={createLocaleStore('en')}>
      <ChromeContexts platform="mac" cms={{ mode: 'online' }}>
        {children}
      </ChromeContexts>
    </LocaleProvider>
  )
}
