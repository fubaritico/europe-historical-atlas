import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { createHistoryRelay } from '../canvas/historyRelay'
import { openEmptyYear } from '../state/openEmptyYear'
import { createCartographerStore } from '../state/store'
import { UNFRAMED } from '../view/viewport'

import { AppBarPanel, DocBarPanel } from './TopBars'

/**
 * A store on an empty 1100, unframed.
 * @returns the store
 */
function store() {
  return createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
}

const meta = () => document.querySelector('.doc-tab__meta')?.textContent

describe('top bars, bound', () => {
  describe('happy path', () => {
    it('reads the open year from the store', () => {
      render(
        <AppBarPanel
          store={store()}
          name="Cartographer"
          onSave={vi.fn()}
          onOpenSnapshot={vi.fn()}
        />
      )
      expect(document.querySelector('.app-brand__year')?.textContent).toBe('1100')
    })

    it('undoes through the canvas’s relay, never the store straight (ARCH-101)', async () => {
      const shared = store()
      const history = createHistoryRelay(vi.fn())
      const answer = vi.fn()
      history.register(answer)
      const undo = vi.spyOn(shared.getState(), 'undo')
      shared.setState({ undoLabel: 'Draw France' })
      render(<DocBarPanel store={shared} history={history} />)

      await userEvent.click(screen.getByRole('button', { name: 'Undo Draw France' }))
      expect(answer).toHaveBeenCalledWith('undo')
      expect(undo).not.toHaveBeenCalled()
    })
  })

  describe('variants', () => {
    it('writes the zoom and follows the view, with no re-render', () => {
      const shared = store()
      const ratio = window.devicePixelRatio
      render(<DocBarPanel store={shared} history={createHistoryRelay(vi.fn())} />)
      expect(meta()).toBe('@ —')
      act(() => {
        shared.getState().setViewport({ scale: 0.48 * ratio, originX: 0, originY: 0 })
      })
      expect(meta()).toBe('@ 48 %')
    })
  })

  describe('managed errors', () => {
    it('warns, and undoes nothing, when no canvas has registered', async () => {
      const shared = store()
      const warn = vi.fn()
      shared.setState({ undoLabel: 'Draw France' })
      render(<DocBarPanel store={shared} history={createHistoryRelay(warn)} />)

      await userEvent.click(screen.getByRole('button', { name: 'Undo Draw France' }))
      expect(warn).toHaveBeenCalledOnce()
    })
  })

  // L4: N/A — bindings; what can throw is the canvas's history, tested in controller.test.ts.

  describe('edge cases', () => {
    it('stops following the view once unmounted', () => {
      const shared = store()
      const { unmount } = render(
        <DocBarPanel store={shared} history={createHistoryRelay(vi.fn())} />
      )
      unmount()
      expect(() => {
        shared.getState().setViewport({ scale: 1, originX: 0, originY: 0 })
      }).not.toThrow()
    })
  })
})
