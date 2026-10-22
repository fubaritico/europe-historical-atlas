import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createLocaleStore } from '../../i18n/localeStore'
import { LocaleContext } from '../i18n/localeContext'

import { useTranslation } from './useTranslation'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'
import type { Locale } from '@europe-historical-atlas/core/i18n/locale'
import type { ReactNode } from 'react'

const CATALOGUE: Catalogue<'save' | 'saved'> = {
  fr: {
    save: 'Enregistrer',
    saved: '{count, plural, one {# pays enregistré} other {# pays enregistrés}}',
  },
  en: { save: 'Save', saved: '{count, plural, one {# polity saved} other {# polities saved}}' },
}

/** A wrapper providing a language. */
function inLocale(locale: Locale) {
  return function Provider({ children }: { children: ReactNode }) {
    // Render
    return <LocaleContext value={createLocaleStore(locale)}>{children}</LocaleContext>
  }
}

describe('useTranslation', () => {
  describe('happy path', () => {
    it('speaks the language the page provides', () => {
      const { result } = renderHook(() => useTranslation(CATALOGUE), { wrapper: inLocale('fr') })
      expect(result.current('save')).toBe('Enregistrer')
    })
  })

  describe('variants', () => {
    it('speaks English to an English page', () => {
      const { result } = renderHook(() => useTranslation(CATALOGUE), { wrapper: inLocale('en') })
      expect(result.current('saved', { count: 2 })).toBe('2 polities saved')
    })

    it('keeps the same translator across renders, while nothing changes', () => {
      const { result, rerender } = renderHook(() => useTranslation(CATALOGUE), {
        wrapper: inLocale('en'),
      })
      const first = result.current
      rerender()
      expect(result.current).toBe(first)
    })
  })

  describe('managed errors', () => {
    // A component with no language above it is a wiring fault; a silent English would hide it.
    it('throws outside a language provider, rather than speak a default', () => {
      expect(() => renderHook(() => useTranslation(CATALOGUE))).toThrow(
        'Cartographer: no language in context — provide LocaleProvider at the root.'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('throws at the first render over a malformed message', () => {
      const broken: Catalogue<'x'> = { fr: { x: '{oops' }, en: { x: '{oops' } }
      expect(() => renderHook(() => useTranslation(broken), { wrapper: inLocale('en') })).toThrow()
    })
  })

  // L5 (edge cases): N/A — the language is fixed for a session; a switch (ATLAS-266) brings its own cases.
})
