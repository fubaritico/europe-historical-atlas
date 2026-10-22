import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createLocaleStore } from '../../../../i18n/localeStore'
import { LocaleProvider } from '../../LocaleProvider'

import { KnownPolityMenu } from './KnownPolityMenu'

import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

// The menu itself made to fail, so what is under test is the boundary this binding puts around it.
vi.mock('../../PolityStackMenu', () => ({
  PolityStackMenu: () => {
    throw new Error('the menu broke')
  },
}))

const POLITY: YearPolity = {
  id: 'fr',
  name: 'Reaume de France',
  rank: 'kingdom',
  status: null,
  suzerain: null,
  existsFrom: null,
  existsTo: null,
  colour: null,
  wikidata: null,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('KnownPolityMenu', () => {
  // L1–L2: the menu's own behaviour is PolityStackMenu's tests'; here only its boundary is.

  describe('managed errors', () => {
    // A menu failing must not take the Polities panel down with it (the dev's call, 2026-10-21): without its
    // own boundary, the error would escape this render and blank the zone around it.
    it('keeps its failure to its own place, beside the panel it opened from', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      render(
        <LocaleProvider store={createLocaleStore('en')}>
          <p>the panel</p>
          <KnownPolityMenu
            polity={POLITY}
            at={{ x: 0, y: 0 }}
            moves={{ front: true, forward: true, backward: true, back: true }}
            restack={() => true}
            onResult={() => undefined}
            onEdit={() => undefined}
            onClose={() => undefined}
          />
        </LocaleProvider>
      )
      expect(screen.getByText('the panel').tagName).toBe('P')
      expect(screen.getByRole('alert').textContent).toContain('the menu broke')
    })
  })

  // L4–L5: N/A — a binding with no input of its own beyond the resolved polity.
})
