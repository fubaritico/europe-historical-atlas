import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { openEmptyYear } from '../state/openEmptyYear'
import { createCartographerStore } from '../state/store'
import { UNFRAMED } from '../view/viewport'

import { PolitiesPanel } from './PolitiesPanel'

function mount() {
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  render(<PolitiesPanel store={store} />)
  return { store, user: userEvent.setup() }
}

/** The dialogue element, open or not — the design system's Modal is a native `<dialog>`. */
const dialog = () => document.querySelector('dialog')

describe('PolitiesPanel', () => {
  describe('happy path', () => {
    it('opens the form on [+ New polity]', async () => {
      const { user } = mount()
      expect(dialog()?.hasAttribute('open')).toBe(false)
      await user.click(screen.getByRole('button', { name: 'New polity' }))
      expect(dialog()?.hasAttribute('open')).toBe(true)
    })
  })

  describe('variants', () => {
    // The dialogue opens ready to type: the cursor in Name, not on the close cross that comes first.
    it('opens with the focus in Name', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('button', { name: 'New polity' }))
      expect(document.activeElement).toBe(screen.getByLabelText('Name'))
    })

    it('closes it again on Cancel', async () => {
      const { user } = mount()
      await user.click(screen.getByRole('button', { name: 'New polity' }))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(dialog()?.hasAttribute('open')).toBe(false)
    })

    it('closes it once the polity is created', async () => {
      const { store, user } = mount()
      await user.click(screen.getByRole('button', { name: 'New polity' }))
      await user.type(screen.getByLabelText('Name'), 'France')
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(dialog()?.hasAttribute('open')).toBe(false)
      expect(store.getState().document.polities).toHaveLength(1)
    })
  })

  // L3: N/A — the panel only opens and closes; refusals are the dialogue's, tested there.
  // L4: N/A — no input of its own.

  describe('edge cases', () => {
    it('names its region, so a screen reader can reach it', () => {
      mount()
      expect(screen.getByRole('region', { name: 'Polities' })).toBeTruthy()
    })
  })
})
