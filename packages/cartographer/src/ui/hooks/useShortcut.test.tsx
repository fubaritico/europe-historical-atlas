import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createLocaleStore } from '../../i18n/localeStore'
import { LocaleProvider } from '../components/LocaleProvider'
import { PlatformContext } from '../i18n/platformContext'

import { useShortcut } from './useShortcut'

import type { Locale } from '@europe-historical-atlas/core/i18n/locale'
import type { Platform } from '@europe-historical-atlas/core/i18n/shortcuts'
import type { ReactNode } from 'react'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * The hook under a language and a system.
 * @param locale - the language
 * @param platform - the system
 * @returns the hook's function
 */
function shortcutsFor(locale: Locale, platform: Platform) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <LocaleProvider store={createLocaleStore(locale)}>
      <PlatformContext value={platform}>{children}</PlatformContext>
    </LocaleProvider>
  )
  return renderHook(() => useShortcut(), { wrapper }).result.current
}

/**
 * A language and no system.
 * @param props - the tree
 * @param props.children - what to wrap
 * @returns the tree, in French
 */
function FrenchOnly({ children }: { children: ReactNode }) {
  // Render
  return <LocaleProvider store={createLocaleStore('fr')}>{children}</LocaleProvider>
}

describe('useShortcut', () => {
  describe('happy path', () => {
    it('writes a command’s shortcut in the Mac’s symbols on a Mac', () => {
      expect(shortcutsFor('fr', 'mac')('saveAs').shown).toBe('⇧⌘S')
    })
  })

  describe('variants', () => {
    it('writes it in French words elsewhere', () => {
      expect(shortcutsFor('fr', 'other')('saveAs').shown).toBe('Ctrl+Maj+S')
    })

    it('writes it in English words elsewhere, in English', () => {
      expect(shortcutsFor('en', 'other')('redo').shown).toBe('Ctrl+Shift+Z')
    })

    it('tells a screen reader both systems’ forms', () => {
      expect(shortcutsFor('fr', 'mac')('front').aria).toBe(
        'Meta+Shift+ArrowUp Control+Shift+ArrowUp'
      )
    })
  })

  describe('managed errors', () => {
    it('throws with no system above it, rather than guess one', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      expect(() => renderHook(() => useShortcut(), { wrapper: FrenchOnly })).toThrow(
        /no system in context/
      )
    })
  })

  // L4: N/A — a pure reading of two contexts and a table.
  // L5: N/A — every command of the table is a literal chord; the converter's own edges are core's tests.
})
