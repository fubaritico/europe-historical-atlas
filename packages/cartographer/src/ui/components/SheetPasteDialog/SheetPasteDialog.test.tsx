import { act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import { copySheet } from '@europe-historical-atlas/core/editor/clipboard'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { createHeldClipboard } from '../../../state/heldClipboard'
import { createCartographerStore } from '../../../state/store'
import { UNFRAMED } from '../../../viewport/viewport'
import { renderInEnglish } from '../../testing/renderInEnglish'

import { SheetPasteDialog } from './SheetPasteDialog'

// s22-copy-paste.md, « # 3 — a sheet onto an existing polity » — the dev, 2026-11-05.

/**
 * The open dialogue's contents.
 * @returns a query scoped to it
 */
function open() {
  const node = document.querySelector<HTMLElement>('dialog[open]')
  if (node === null) throw new Error('no open dialogue')
  return within(node)
}

/**
 * The dialogue over the shared-border map, the Empire's sheet on the clipboard — changed where said.
 * @param changes - what the copied sheet says differently
 * @returns the store, the status bar's sentences and the user
 */
function mounted(changes: Record<string, unknown> = { rank: 'kingdom', existsFrom: 900 }) {
  const store = createCartographerStore({
    edition: { document: sharedBorderDocument(), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  const sheet = copySheet(sharedBorderDocument(), 'hre', '1100-backup')
  if (sheet === null) throw new Error('fixture: no sheet')
  const clipboard = createHeldClipboard(
    { ...sheet, polity: { ...sheet.polity, ...changes } },
    () => true
  )
  const said: string[] = []
  renderInEnglish(
    <SheetPasteDialog store={store} clipboard={clipboard} say={(message) => said.push(message)} />
  )
  return { store, said, user: userEvent.setup() }
}

describe('SheetPasteDialog', () => {
  describe('happy path', () => {
    it('lists each field that differs, ticked, the map’s value and the copied one', () => {
      const { store } = mounted()
      act(() => {
        store.getState().askSheetPaste('hre')
      })

      expect(
        open()
          .getAllByRole('checkbox')
          .map((box) => (box as HTMLInputElement).checked)
      ).toEqual([true, true])
      expect(open().getByText('empire')).toBeTruthy()
      expect(open().getByText('900')).toBeTruthy()
    })

    it('pastes the fields ticked, one step, and says it', async () => {
      const { store, said, user } = mounted()
      act(() => {
        store.getState().askSheetPaste('hre')
      })
      await user.click(open().getByRole('checkbox', { name: 'Exists from' }))
      await user.click(open().getByRole('button', { name: 'Paste' }))

      const hre = store.getState().document.polities.find((polity) => polity.id === 'hre')
      expect([hre?.rank, hre?.existsFrom]).toEqual(['kingdom', 962])
      expect(said).toEqual(['Sheet pasted onto Sacrum Imperium: one field taken'])
      expect(store.getState().undoLabel).toBe('Paste the sheet onto Sacrum Imperium')
    })
  })

  describe('managed errors', () => {
    it('opens nothing for two sheets the same, and says so', () => {
      const { store, said } = mounted({})
      act(() => {
        store.getState().askSheetPaste('hre')
      })

      expect(document.querySelector('dialog[open]')).toBeNull()
      expect(said).toEqual([
        'Nothing to paste: the sheets of Sacrum Imperium and Sacrum Imperium are the same',
      ])
      expect(store.getState().sheetPasteFor).toBeNull()
    })

    it('pastes nothing with every box unticked, and says so', async () => {
      const { store, said, user } = mounted({ rank: 'kingdom' })
      act(() => {
        store.getState().askSheetPaste('hre')
      })
      await user.click(open().getByRole('checkbox', { name: 'Rank' }))
      await user.click(open().getByRole('button', { name: 'Paste' }))

      expect(store.getState().canUndo).toBe(false)
      expect(said).toEqual(['No field ticked: nothing is pasted'])
    })

    it('closes on Cancel, pasting nothing', async () => {
      const { store, user } = mounted()
      act(() => {
        store.getState().askSheetPaste('hre')
      })
      await user.click(open().getByRole('button', { name: 'Cancel' }))

      expect(store.getState().sheetPasteFor).toBeNull()
      expect(store.getState().canUndo).toBe(false)
    })

    it('says in the console a paste asked with no sheet on the clipboard, and closes', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const store = createCartographerStore({
        edition: { document: sharedBorderDocument(), clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })
      renderInEnglish(
        <SheetPasteDialog
          store={store}
          clipboard={createHeldClipboard(null, () => true)}
          say={vi.fn()}
        />
      )
      act(() => {
        store.getState().askSheetPaste('hre')
      })

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('has nothing to show'))
      expect(store.getState().sheetPasteFor).toBeNull()
      warn.mockRestore()
    })
  })
})
