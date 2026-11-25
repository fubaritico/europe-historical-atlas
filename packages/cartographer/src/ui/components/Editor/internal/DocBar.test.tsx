import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { DocBar } from './DocBar'

import type { DocBarProps } from './DocBar'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Render the bar with spies, overriding what a test needs.
 * @param overrides - the props that differ
 * @returns the props rendered
 */
function mount(overrides: Partial<DocBarProps> = {}): DocBarProps {
  const props: DocBarProps = {
    tabs: [{ id: '1100-essai', name: '1100-essai', active: true }],
    onActivate: vi.fn(),
    onClose: vi.fn(),
    undoLabel: 'Draw Royaume de France',
    redoLabel: null,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    zoomRef: () => undefined,
    ...overrides,
  }
  renderInEnglish(<DocBar {...props} />)
  return props
}

describe('DocBar', () => {
  describe('happy path', () => {
    // CARTO-556: the tab names the map open, not its year — two maps of one year must be told apart.
    it('names the map open in its tab, its zoom beside it', () => {
      mount()
      expect(
        screen.getByRole('tab', { name: '1100-essai @ —' }).getAttribute('aria-selected')
      ).toBe('true')
    })

    it('closes the map on its tab’s cross', async () => {
      const { onClose } = mount()
      await userEvent.click(screen.getByRole('button', { name: 'Close 1100-essai' }))
      expect(onClose).toHaveBeenCalledWith('1100-essai')
    })

    it('undoes on the Undo button, naming the gesture it takes back', async () => {
      const { onUndo } = mount()
      await userEvent.click(screen.getByRole('button', { name: 'Undo Draw Royaume de France' }))
      expect(onUndo).toHaveBeenCalledOnce()
    })
  })

  describe('variants', () => {
    it('redoes on the Redo button when there is something to redo', async () => {
      const { onRedo } = mount({ redoLabel: 'Draw Bourgogne' })
      await userEvent.click(screen.getByRole('button', { name: 'Redo Draw Bourgogne' }))
      expect(onRedo).toHaveBeenCalledOnce()
    })

    it('hands the zoom’s node to the binding', () => {
      const zoomRef = vi.fn()
      mount({ zoomRef })
      expect(zoomRef).toHaveBeenCalledWith(expect.any(HTMLSpanElement))
    })
  })

  describe('managed errors', () => {
    it('says there is nothing to redo, and does not redo', async () => {
      const { onRedo } = mount()
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const redo = screen.getByRole('button', { name: 'Redo' })

      expect(redo.getAttribute('aria-disabled')).toBe('true')
      expect(redo.getAttribute('title')).toBe('Redo — nothing to redo')
      await userEvent.click(redo)
      expect(onRedo).not.toHaveBeenCalled()
    })

    it('marks checking unavailable, naming its scenario', () => {
      mount()
      const check = screen.getByRole('button', { name: 'Check this year' })
      expect(check.getAttribute('aria-disabled')).toBe('true')
      expect(check.getAttribute('title')).toContain('s10')
      expect(check.className).toContain('bar-button--primary')
    })
  })

  // L4: N/A — a view; the history's own failures propagate from the canvas, tested there.

  describe('edge cases', () => {
    // The list several maps open will fill: each its tab, the zoom on the one shown only.
    it('lays one tab per map, the zoom written on the active one only', () => {
      mount({
        tabs: [
          { id: '1100', name: '1100', active: false },
          { id: '1200', name: '1200', active: true },
        ],
      })
      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['1100', '1200 @ —'])
    })

    it('says there is nothing to undo on a fresh history', () => {
      mount({ undoLabel: null })
      expect(screen.getByRole('button', { name: 'Undo' }).getAttribute('aria-disabled')).toBe(
        'true'
      )
    })
  })
})
