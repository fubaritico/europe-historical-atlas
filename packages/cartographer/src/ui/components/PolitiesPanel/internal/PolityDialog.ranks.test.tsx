import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import { NO_COLOUR } from '@europe-historical-atlas/core/data/yearFormat'

import { openEmptyYear } from '../../../../state/openEmptyYear'
import { createCartographerStore } from '../../../../state/store'
import { UNFRAMED } from '../../../../viewport/viewport'
import { renderInEnglish } from '../../../testing/renderInEnglish'

import { PolityDialog } from './PolityDialog'

import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

/** A Wikidata source that knows nothing — the form's panel stays quiet. */
const NO_WIKIDATA = { read: () => Promise.resolve({ found: new Map(), unknown: [] }) }

const STEP = { kind: 'create-polity', label: 'create polity' }

const ANJOU: YearPolity = {
  id: 'anjou',
  name: 'County of Anjou',
  rank: 'county',
  status: 'country',
  suzerain: null,
  existsFrom: null,
  existsTo: null,
  colour: null,
  wikidata: null,
}

/** The sentence the form says of a vassal that outranks its suzerain. */
const WARNING = /ranks higher than its suzerain/

/**
 * Open the dialogue on a new polity, in a year that holds the county of Anjou.
 * @returns the store and a user
 */
function openDialog() {
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  store.getState().createPolity(ANJOU, STEP)
  renderInEnglish(
    <PolityDialog store={store} editing={null} isOpen onClose={vi.fn()} wikidata={NO_WIKIDATA} />
  )
  return { store, user: userEvent.setup() }
}

/**
 * Type a name, then choose a rank from its list.
 * @param user - the user
 * @param name - the polity's name
 * @param rank - the rank, as the list names it
 * @returns nothing
 */
async function nameAndRank(user: ReturnType<typeof userEvent.setup>, name: string, rank: string) {
  await user.type(screen.getByLabelText('Name'), name)
  await user.click(screen.getByRole('button', { name: 'Rank' }))
  await user.click(screen.getByRole('option', { name: rank }))
}

/**
 * Choose the county of Anjou as the suzerain.
 * @param user - the user
 * @returns nothing
 */
async function underAnjou(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('combobox', { name: 'Suzerain' }), 'anjou')
  await user.click(await screen.findByRole('option', { name: 'County of Anjou' }))
}

// CARTO-487 and CORE-489, the dev, 2026-11-20: the ranks of the form, and the hierarchical ladder they check.
describe('PolityDialog — the ranks', () => {
  describe('happy path', () => {
    it('offers the ranks the form lacked: a caliphate is chosen and saved', async () => {
      const { store, user } = openDialog()
      await nameAndRank(user, 'Fatimids', 'caliphate')
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[1]?.rank).toBe('caliphate')
    })

    it('saves a people with no colour: its name alone', async () => {
      const { store, user } = openDialog()
      await nameAndRank(user, 'Sami', 'people')
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[1]?.rank).toBe('people')
      expect(store.getState().document.polities[1]?.colour).toBe(NO_COLOUR)
    })
  })

  describe('variants', () => {
    it('says a kingdom put under a county, with the two names and ranks, and saves it all the same', async () => {
      const { store, user } = openDialog()
      await nameAndRank(user, 'Navarre', 'kingdom')
      await underAnjou(user)
      expect(screen.getByText(WARNING).textContent).toBe(
        'To check: Navarre (kingdom) ranks higher than its suzerain, County of Anjou (county). You may save it as it is.'
      )
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[1]?.suzerain).toBe('anjou')
    })

    it('says nothing of a viscounty under the county', async () => {
      const { user } = openDialog()
      await nameAndRank(user, 'Thouars', 'viscounty')
      await underAnjou(user)
      expect(screen.queryByText(WARNING)).toBeNull()
    })

    it('takes the warning away once the rank is lowered', async () => {
      const { user } = openDialog()
      await nameAndRank(user, 'Navarre', 'kingdom')
      await underAnjou(user)
      expect(screen.getByText(WARNING)).toBeTruthy()
      await user.click(screen.getByRole('button', { name: 'Rank' }))
      await user.click(screen.getByRole('option', { name: 'lordship' }))
      expect(screen.queryByText(WARNING)).toBeNull()
    })
  })

  // L3: N/A — nothing is refused: the warning never blocks the save (asserted above)
  // L4: N/A — no async work beyond the user's gestures

  describe('edge cases', () => {
    it('says nothing before a suzerain is chosen', async () => {
      const { user } = openDialog()
      await nameAndRank(user, 'Navarre', 'kingdom')
      expect(screen.queryByText(WARNING)).toBeNull()
    })
  })
})
