import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/data/yearDocument'

import { openEmptyYear } from '../../../../state/openEmptyYear'
import { createCartographerStore } from '../../../../state/store'
import { UNFRAMED } from '../../../../viewport/viewport'
import { renderInEnglish } from '../../../testing/renderInEnglish'

import { PolityDialog } from './PolityDialog'

import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

/** A Wikidata source that knows nothing — the form's panel stays quiet. */
const NO_WIKIDATA = { read: () => Promise.resolve({ found: new Map(), unknown: [] }) }

const STEP = { kind: 'create-polity', label: 'create polity' }

const THURINGIA_CMS = { id: 42, name: 'Thuringe', wikidata: null }
const MEISSEN_CMS = { id: 43, name: 'Marche de Misnie', wikidata: 'Q685' }

/** The Thuringia of 1100 on the map, with no Wikidata id. */
const THURINGIA: YearPolity = {
  id: 'duchy-of-thuringia',
  name: 'Thuringia',
  rank: 'county',
  status: 'country',
  suzerain: null,
  existsFrom: null,
  existsTo: null,
  colour: null,
  wikidata: null,
}

/**
 * The polity's dialogue over a store holding these territories of the CMS.
 * @param editing - the polity edited, or `null` to create one
 * @param territories - the CMS's territories the export gave
 * @returns the store and the user
 */
function openDialog(editing: YearPolity | null, territories = [THURINGIA_CMS, MEISSEN_CMS]) {
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  store.getState().setTerritories(territories)
  if (editing !== null) store.getState().createPolity(editing, STEP)
  renderInEnglish(
    <PolityDialog store={store} editing={editing} isOpen onClose={vi.fn()} wikidata={NO_WIKIDATA} />
  )
  return { store, user: userEvent.setup() }
}

const territoryField = () => screen.getByRole('combobox', { name: 'CMS ID' })

// CARTO-450, the dev's rule of 2026-11-16: no Wikidata id, the CMS's territory number
describe('PolityDialog — the CMS territory', () => {
  describe('happy path', () => {
    it('ties the Thuringia of 1100 to its CMS territory, chosen by typing', async () => {
      const { store, user } = openDialog(THURINGIA)
      await user.type(territoryField(), 'thur')
      await user.click(await screen.findByRole('option', { name: 'Thuringe — CMS ID 42' }))
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[0]?.territory).toBe(42)
    })
  })

  describe('variants', () => {
    it('opens a polity with its territory held, and removes it with its cross', async () => {
      const { store, user } = openDialog({ ...THURINGIA, territory: 42 })
      await user.click(screen.getByRole('button', { name: 'Remove Thuringe — CMS ID 42' }))
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[0]?.territory).toBeUndefined()
    })
  })

  describe('managed errors', () => {
    it('says to export again when the export gave no territory', async () => {
      const { user } = openDialog(THURINGIA, [])
      await user.type(territoryField(), 'thur')
      expect(await screen.findByText(/run the CMS export again/)).toBeTruthy()
    })
  })

  // L4: N/A — the field only sets the draft; a polity refused is the form's, tested beside it

  describe('edge cases', () => {
    it('shows a territory the export no longer lists by its number, kept in the file', async () => {
      const { store, user } = openDialog({ ...THURINGIA, territory: 99 }, [THURINGIA_CMS])
      expect(screen.getByRole('button', { name: 'Remove 99' })).toBeTruthy()
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[0]?.territory).toBe(99)
    })
  })
})
