import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { createHistoryRelay } from '../../../../canvas/history/historyRelay'
import { createCartographerStore } from '../../../../state/store'
import { UNFRAMED } from '../../../../viewport/viewport'
import { renderInEnglish } from '../../../testing/renderInEnglish'

import { MenuBarPanel } from './MenuBarPanel'

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
function mount(shared = store()) {
  const onCopy = vi.fn()
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
    />
  )
  return { user: userEvent.setup(), onCopy, answered }
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
    it('names the polity selected in the store in the pastes onto a polity', async () => {
      const shared = store()
      act(() => {
        shared.getState().chooseTarget('hre')
      })
      const { user } = mount(shared)

      expect((await editCommand(user, /Paste the sheet/)).textContent).toContain(
        'Paste the sheet onto Sacrum Imperium…'
      )
    })

    it('copies through the gesture handed, once a polity is selected', async () => {
      const shared = store()
      act(() => {
        shared.getState().chooseTarget('fr-couronne')
      })
      const { user, onCopy } = mount(shared)
      await user.click(await editCommand(user, /^Copy/))

      expect(onCopy).toHaveBeenCalledOnce()
    })
  })

  describe('variants', () => {
    it('lets Copy act on two anchors selected, with no polity', async () => {
      const shared = store()
      act(() => {
        shared.getState().setSelectedAnchors([1, 2])
      })
      const { user } = mount(shared)

      expect((await editCommand(user, /^Copy/)).getAttribute('aria-disabled')).toBe('false')
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

      expect((await editCommand(user, /^Copy/)).getAttribute('aria-disabled')).toBe('true')
    })

    it('greys Copy with one anchor selected, a point being no stretch', async () => {
      const shared = store()
      act(() => {
        shared.getState().setSelectedAnchors([1])
      })
      const { user } = mount(shared)

      expect((await editCommand(user, /^Copy/)).getAttribute('aria-disabled')).toBe('true')
    })
  })

  // L4: N/A — the store and the relay are real; nothing is fetched.

  describe('edge cases', () => {
    it('follows a renamed polity, the document being edited in place', async () => {
      const shared = store()
      act(() => {
        shared.getState().chooseTarget('hre')
      })
      const { user } = mount(shared)
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

      expect((await editCommand(user, /Paste the sheet/)).textContent).toContain(
        'Regnum Teutonicum'
      )
    })
  })
})
