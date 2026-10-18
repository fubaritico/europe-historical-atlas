import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
    year: 1100,
    undoLabel: 'Draw Royaume de France',
    redoLabel: null,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    zoomRef: () => undefined,
    ...overrides,
  }
  render(<DocBar {...props} />)
  return props
}

describe('DocBar', () => {
  describe('happy path', () => {
    it('names the open year in the tab, its zoom beside it', () => {
      mount()
      expect(document.querySelector('.doc-tab__name')?.textContent).toBe('1100')
      expect(document.querySelector('.doc-tab__meta')?.textContent).toBe('@ —')
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

    it('marks closing and checking unavailable, naming their scenarios', () => {
      mount()
      expect(screen.getByRole('button', { name: 'Close 1100' }).getAttribute('title')).toContain(
        's04'
      )
      const check = screen.getByRole('button', { name: 'Check this year' })
      expect(check.getAttribute('aria-disabled')).toBe('true')
      expect(check.getAttribute('title')).toContain('s10')
      expect(check.className).toContain('bar-button--primary')
    })
  })

  // L4: N/A — a view; the history's own failures propagate from the canvas, tested there.

  describe('edge cases', () => {
    it('says there is nothing to undo on a fresh history', () => {
      mount({ undoLabel: null })
      expect(screen.getByRole('button', { name: 'Undo' }).getAttribute('aria-disabled')).toBe(
        'true'
      )
    })
  })
})
