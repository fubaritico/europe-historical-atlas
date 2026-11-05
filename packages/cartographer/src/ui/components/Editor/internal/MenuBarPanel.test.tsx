import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { copyPoints, copyPolities, copySheet } from '@europe-historical-atlas/core/editor/clipboard'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { createHistoryRelay } from '../../../../canvas/history/historyRelay'
import { summariseClipboard } from '../../../../state/clipboardSlice'
import { createCartographerStore } from '../../../../state/store'
import { UNFRAMED } from '../../../../viewport/viewport'
import { renderInEnglish } from '../../../testing/renderInEnglish'

import { MenuBarPanel } from './MenuBarPanel'

import type { ClipboardContent } from '@europe-historical-atlas/core/editor/clipboard'

/**
 * A store on the shared-border fixture — France and the Empire — nothing selected.
 * @returns the store
 */
function store() {
  return createCartographerStore({
    edition: { document: sharedBorderDocument(), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
}

/**
 * The bound menu bar on a store, with what its gestures record.
 * @param shared - the store
 * @returns the user, the copy recorder and the history's answer
 */
function mount(shared = store(), held: ClipboardContent | null = null) {
  act(() => {
    shared.getState().setHeld(summariseClipboard(held))
  })
  const onCopy = vi.fn()
  const onPaste = vi.fn()
  const answered = vi.fn()
  const history = createHistoryRelay(vi.fn())
  history.register(answered)
  renderInEnglish(
    <MenuBarPanel
      store={shared}
      history={history}
      onOpen={vi.fn()}
      onSave={vi.fn()}
      onSaveAs={vi.fn()}
      onSaveCopy={vi.fn()}
      onCopy={onCopy}
      onPaste={onPaste}
      onSelectAll={vi.fn()}
      onCopySheet={vi.fn()}
    />
  )
  return { user: userEvent.setup(), onCopy, onPaste, answered }
}

/**
 * Open Edit and read one of its commands.
 * @param user - the user
 * @param name - the command's accessible name, a pattern
 * @returns the command's element
 */
async function editCommand(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
  return screen.getByRole('menuitem', { name })
}

describe('MenuBarPanel', () => {
  describe('happy path', () => {
    // The dev, 2026-11-05: one paste, named after what the clipboard holds and the polity selected.
    it('names the paste after a sheet held, short', async () => {
      const shared = store()
      act(() => {
        shared.getState().chooseTarget('fr-couronne')
      })
      const { user } = mount(shared, copySheet(sharedBorderDocument(), 'hre', '1100'))

      expect((await editCommand(user, /^Paste sheet/)).getAttribute('aria-disabled')).toBe('false')
    })

    it('copies through the gesture handed, once a polity is selected', async () => {
      const shared = store()
      act(() => {
        shared.getState().chooseTarget('fr-couronne')
      })
      const { user, onCopy } = mount(shared)
      await user.click(await editCommand(user, /^Copy(?! sheet)/))

      expect(onCopy).toHaveBeenCalledOnce()
    })

    it('pastes through the gesture handed when the clipboard holds polities', async () => {
      const copied = copyPolities(sharedBorderDocument(), ['hre'], '1100-backup')
      if (copied === null) throw new Error('fixture: nothing copied')
      const { user, onPaste } = mount(store(), copied)
      await user.click(await editCommand(user, /^Paste polities/))

      expect(onPaste).toHaveBeenCalledOnce()
    })
  })

  describe('variants', () => {
    it('lights Paste polities as soon as a copy is held, with no other change in the store', async () => {
      const shared = store()
      const copied = copyPolities(sharedBorderDocument(), ['hre'], '1100')
      if (copied === null) throw new Error('fixture: nothing copied')
      const { user } = mount(shared)
      act(() => {
        shared.getState().setHeld(summariseClipboard(copied))
      })

      expect((await editCommand(user, /^Paste polities/)).getAttribute('aria-disabled')).toBe(
        'false'
      )
    })

    it('names the paste after points held, greyed with no polity to paste them onto', async () => {
      const stretch = copyPoints(sharedBorderDocument(), [1, 2], '1100', 'hre').copy
      if (stretch === null) throw new Error('fixture: no points')
      const { user } = mount(store(), stretch)

      expect((await editCommand(user, /^Paste points/)).getAttribute('aria-disabled')).toBe('true')
    })

    it('lets Copy act on two anchors selected, with no polity', async () => {
      const shared = store()
      act(() => {
        shared.getState().setSelectedAnchors([1, 2])
      })
      const { user } = mount(shared)

      expect((await editCommand(user, /^Copy(?! sheet)/)).getAttribute('aria-disabled')).toBe(
        'false'
      )
    })

    it('undoes through the canvas’s history, never the store straight', async () => {
      const shared = store()
      act(() => {
        shared.getState().commit({ kind: 'move-anchor', label: 'moved' })
      })
      const { user, answered } = mount(shared)
      await user.click(await editCommand(user, /^Undo/))

      expect(answered).toHaveBeenCalledWith('undo')
    })
  })

  describe('managed errors', () => {
    it('greys Copy with nothing selected', async () => {
      const { user } = mount()

      expect((await editCommand(user, /^Copy(?! sheet)/)).getAttribute('aria-disabled')).toBe(
        'true'
      )
    })

    it('greys Copy with one anchor selected, a point alone being no piece', async () => {
      const shared = store()
      act(() => {
        shared.getState().setSelectedAnchors([1])
      })
      const { user } = mount(shared)

      expect((await editCommand(user, /^Copy(?! sheet)/)).getAttribute('aria-disabled')).toBe(
        'true'
      )
    })
  })

  // L4: N/A — the store and the relay are real; nothing is fetched.

  describe('edge cases', () => {
    it('follows a renamed polity, the document being edited in place', async () => {
      const shared = store()
      act(() => {
        shared.getState().chooseTarget('hre')
      })
      const { user } = mount(shared, copySheet(sharedBorderDocument(), 'fr-couronne', '1100'))
      const polity = shared.getState().document.polities.find((each) => each.id === 'hre')
      act(() => {
        if (polity !== undefined)
          shared
            .getState()
            .editPolity(
              { ...polity, name: 'Regnum Teutonicum' },
              { kind: 'edit-polity', label: 'rename' }
            )
      })

      expect((await editCommand(user, /^Select all/)).textContent).toContain('Regnum Teutonicum')
    })
  })
})
