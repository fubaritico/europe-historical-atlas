import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/data/yearDocument'

import { openEmptyYear } from '../../../../state/openEmptyYear'
import { createCartographerStore } from '../../../../state/store'
import { UNFRAMED } from '../../../../viewport/viewport'
import { renderInEnglish } from '../../../testing/renderInEnglish'

import { PolityDialog } from './PolityDialog'

import type { ContentTerritory } from '@europe-historical-atlas/core/data/contentFormat'
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
function openDialog(
  editing: YearPolity | null,
  territories: ContentTerritory[] = [THURINGIA_CMS, MEISSEN_CMS]
) {
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

/**
 * Choose Jablé in « CMS ID ».
 * @param user - the user
 * @returns nothing
 */
async function chooseJable(user: ReturnType<typeof userEvent.setup>) {
  await user.type(territoryField(), 'jab')
  await user.click(await screen.findByRole('option', { name: 'Jablé — CMS ID 372' }))
}

// CARTO-488, the dev, 2026-11-20: choosing « Jablé — CMS ID 372 » filled nothing — the territory now proposes.
describe('PolityDialog — what the CMS territory proposes', () => {
  const JABLE_CMS = {
    id: 372,
    name: 'Jablé',
    wikidata: null,
    kind: 'emirate',
    existsFrom: 1081,
    existsTo: null,
  }

  it('proposes the name, the rank and the year of the territory chosen, and writes none of them', async () => {
    const { user } = openDialog(null, [JABLE_CMS])
    await chooseJable(user)
    const list = screen.getByRole('list', { name: 'What the CMS proposes' })
    expect([...list.querySelectorAll('li')].map((line) => line.textContent)).toEqual([
      'NameJabléUse',
      'RankemirateUse',
      'Exists from1081Use',
    ])
    expect(screen.getByLabelText<HTMLInputElement>('Name').value).toBe('')
  })

  it('takes each value on its « Use », and saves the polity with them', async () => {
    const { store, user } = openDialog(null, [JABLE_CMS])
    await chooseJable(user)
    await user.click(screen.getByRole('button', { name: 'Use “Jablé” for Name' }))
    await user.click(screen.getByRole('button', { name: 'Use “emirate” for Rank' }))
    await user.click(screen.getByRole('button', { name: 'Use “1081” for Exists from' }))
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(store.getState().document.polities[0]).toMatchObject({
      name: 'Jablé',
      rank: 'emirate',
      existsFrom: 1081,
      territory: 372,
    })
  })

  it('offers « Replace » on a name the author wrote otherwise, and « Agrees », inert, once taken', async () => {
    const { user } = openDialog(null, [JABLE_CMS])
    await user.type(screen.getByLabelText('Name'), 'Jabala')
    await chooseJable(user)
    await user.click(screen.getByRole('button', { name: 'Replace “Jablé” for Name' }))
    expect(screen.getByLabelText<HTMLInputElement>('Name').value).toBe('Jablé')
    expect(
      screen.getByRole('button', { name: 'Agrees “Jablé” for Name' }).getAttribute('aria-disabled')
    ).toBe('true')
  })

  it('proposes the year it exists to when the CMS gives one, and saves it on « Use »', async () => {
    const { store, user } = openDialog(null, [{ ...JABLE_CMS, existsTo: 1109 }])
    await user.type(screen.getByLabelText('Name'), 'Jabala')
    await chooseJable(user)
    await user.click(screen.getByRole('button', { name: 'Use “1109” for Exists to' }))
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(store.getState().document.polities[0]?.existsTo).toBe(1109)
  })

  it('proposes no rank for a territory that is a city: no rank of a polity', async () => {
    const { user } = openDialog(null, [{ ...JABLE_CMS, kind: 'city' }])
    await chooseJable(user)
    const list = screen.getByRole('list', { name: 'What the CMS proposes' })
    expect(list.textContent).not.toContain('Rank')
  })

  it('proposes nothing while no territory is chosen', () => {
    openDialog(null, [JABLE_CMS])
    expect(screen.queryByRole('list', { name: 'What the CMS proposes' })).toBeNull()
  })
})
