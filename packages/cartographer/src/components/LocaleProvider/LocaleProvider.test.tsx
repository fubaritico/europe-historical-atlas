import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useTranslation } from '../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../i18n/actions'
import { createLocaleStore } from '../../i18n/localeStore'

import { LocaleProvider } from './LocaleProvider'

/** A label, translated — what every component of the Cartographer does. */
function SaveLabel() {
  // Context
  const action = useTranslation(ACTION_MESSAGES)

  // Render
  return <span>{action('save')}</span>
}

describe('LocaleProvider', () => {
  describe('happy path', () => {
    it('speaks the language its store holds', () => {
      render(
        <LocaleProvider store={createLocaleStore('fr')}>
          <SaveLabel />
        </LocaleProvider>
      )
      expect(screen.getByText('Enregistrer')).toBeTruthy()
    })
  })

  describe('variants', () => {
    // The language switch of ATLAS-266: a label already shown follows the change, nothing kept in the old one.
    it('rewords what is already shown when the language changes', () => {
      const store = createLocaleStore('fr')
      render(
        <LocaleProvider store={store}>
          <SaveLabel />
        </LocaleProvider>
      )
      act(() => {
        store.set('en')
      })
      expect(screen.getByText('Save')).toBeTruthy()
      expect(screen.queryByText('Enregistrer')).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('leaves a component with no provider above it to throw, rather than speak a default', () => {
      expect(() => render(<SaveLabel />)).toThrow(
        'Cartographer: no language in context — provide LocaleProvider at the root.'
      )
    })
  })

  // L4/L5: N/A — the store's own edges are `localeStore.test.ts`'s.
})
