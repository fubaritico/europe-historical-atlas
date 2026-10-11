import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { describeDrawingTarget } from '../state/drawingTarget'
import { openEmptyYear } from '../state/openEmptyYear'
import { createCartographerStore } from '../state/store'
import { UNFRAMED } from '../view/viewport'

import { PolityDialog } from './PolityDialog'
import { DRAFT_ERRORS } from './polityDraft'

import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

const STEP = { kind: 'create-polity', label: 'create polity' }

const EMPIRE: YearPolity = {
  id: 'hre',
  name: 'Holy Roman Empire',
  rank: 'empire',
  status: 'country',
  suzerain: null,
  existsFrom: 962,
  existsTo: null,
  colour: null,
  wikidata: null,
}

function openDialog() {
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  const onClose = vi.fn()
  render(<PolityDialog store={store} editing={null} isOpen onClose={onClose} />)
  return { store, onClose, user: userEvent.setup() }
}

const field = (name: string) => screen.getByLabelText<HTMLInputElement>(name)

describe('PolityDialog', () => {
  describe('happy path', () => {
    // s02 — "validating the form hands me the Pen": created with no territory, aimed at, Pen in hand.
    it('creates the polity, aims the Pen at it and closes', async () => {
      const { store, onClose, user } = openDialog()
      await user.type(field('Name'), 'Reaume de France')
      await user.click(screen.getByRole('button', { name: 'OK' }))

      const state = store.getState()
      expect(state.document.polities.map((polity) => polity.id)).toEqual(['reaume-de-france'])
      expect(state.tool).toBe('draw')
      expect(describeDrawingTarget(state.document, state.target)?.name).toBe('Reaume de France')
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('proposes the id from the name as it is typed', async () => {
      const { user } = openDialog()
      await user.type(field('Name'), 'Bohême')
      expect(field('Id').value).toBe('boheme')
    })
  })

  describe('variants', () => {
    // H-31: proposed, then the author's.
    it('keeps the id the author wrote', async () => {
      const { store, user } = openDialog()
      await user.type(field('Name'), 'Reaume')
      await user.clear(field('Id'))
      await user.type(field('Id'), 'fr-couronne')
      await user.type(field('Name'), ' de France')
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[0]?.id).toBe('fr-couronne')
    })

    it('records a rank chosen from its list', async () => {
      const { store, user } = openDialog()
      await user.type(field('Name'), 'France')
      await user.click(screen.getByRole('button', { name: 'Rank' }))
      await user.click(screen.getByRole('option', { name: 'kingdom' }))
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[0]?.rank).toBe('kingdom')
    })

    // s02 — "explicit when given": the hex typed in the field, applied on Enter, reaches the file as #rrggbb.
    it('records a colour chosen in the field', async () => {
      const { store, user } = openDialog()
      await user.type(field('Name'), 'France')
      // By role: the hex input is named through `aria-labelledby` (itself + the field's label), which
      // `getByLabelText` does not compose — the accessible name does.
      await user.type(screen.getByRole('textbox', { name: 'Hex color Colour' }), '6699cc{Enter}')
      // Enter applies the hex and nothing more: inside a <form> it would otherwise create the polity.
      expect(store.getState().document.polities).toHaveLength(0)
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[0]?.colour).toBe('#6699cc')
    })

    // 0.5.0: a complete hex previews live, so a colour typed and never confirmed with Enter still
    // reaches the file — the author who types a hex and presses OK has chosen it.
    it('records a colour typed without Enter', async () => {
      const { store, user } = openDialog()
      await user.type(field('Name'), 'France')
      await user.type(screen.getByRole('textbox', { name: 'Hex color Colour' }), '#6699cc')
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[0]?.colour).toBe('#6699cc')
    })

    // s02 — "I leave the colour on automatic": nothing touched, the palette decides.
    it('leaves the colour automatic when it is not touched', async () => {
      const { store, user } = openDialog()
      await user.type(field('Name'), 'France')
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[0]?.colour).toBeNull()
    })

    it('names the step after the polity, for {History}', async () => {
      const { store, user } = openDialog()
      await user.type(field('Name'), 'France')
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().rows.at(-1)?.label).toBe('create France')
    })
  })

  describe('managed errors', () => {
    it('refuses an id the year already holds, beside the id, and creates nothing', async () => {
      const { store, onClose, user } = openDialog()
      store.getState().createPolity(EMPIRE, STEP)
      await user.type(field('Name'), 'Empire')
      await user.clear(field('Id'))
      await user.type(field('Id'), 'hre')
      await user.click(screen.getByRole('button', { name: 'OK' }))

      expect(screen.getByText(DRAFT_ERRORS.idTaken)).toBeTruthy()
      expect(store.getState().document.polities).toHaveLength(1)
      expect(store.getState().target).toBeNull()
      expect(onClose).not.toHaveBeenCalled()
    })

    // The second line: the form checked the ids it knew, the document refuses anyway (an edit landed in
    // between). Nothing may be aimed at — the trap is aiming before reading createPolity's answer.
    it('aims at nothing when the document refuses what the form accepted', async () => {
      const { store, onClose, user } = openDialog()
      store.setState({ createPolity: () => false })
      await user.type(field('Name'), 'France')
      await user.click(screen.getByRole('button', { name: 'OK' }))

      expect(screen.getByText(DRAFT_ERRORS.idTaken)).toBeTruthy()
      expect(store.getState().target).toBeNull()
      expect(store.getState().tool).toBe('navigate')
      expect(onClose).not.toHaveBeenCalled()
    })

    it('refuses an empty form and says what is missing', async () => {
      const { store, user } = openDialog()
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(screen.getByText(DRAFT_ERRORS.nameMissing)).toBeTruthy()
      expect(store.getState().document.polities).toHaveLength(0)
    })
  })

  describe('unmanaged errors', () => {
    // The trap of a form: a button with no type submits. The cross must close, never create.
    it('closes on the cross without creating, even with a valid name typed', async () => {
      const { store, onClose, user } = openDialog()
      await user.type(field('Name'), 'France')
      await user.click(screen.getByRole('button', { name: 'Close' }))
      expect(store.getState().document.polities).toHaveLength(0)
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  describe('edge cases', () => {
    it('cancels without creating, and opens blank the next time', async () => {
      const { store, onClose, user } = openDialog()
      await user.type(field('Name'), 'France')
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(store.getState().document.polities).toHaveLength(0)
      expect(onClose).toHaveBeenCalledOnce()
      expect(field('Name').value).toBe('')
    })

    it('offers the polities of the year as suzerains', async () => {
      const { store, user } = openDialog()
      store.getState().createPolity(EMPIRE, STEP)
      await user.type(field('Name'), 'Duchy of Lorraine')
      await user.click(screen.getByRole('button', { name: 'Suzerain' }))
      await user.click(await screen.findByRole('option', { name: 'Holy Roman Empire' }))
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[1]?.suzerain).toBe('hre')
    })
  })
})
