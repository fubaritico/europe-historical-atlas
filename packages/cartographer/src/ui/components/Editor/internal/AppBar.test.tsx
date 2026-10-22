import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { AppBar } from './AppBar'

/**
 * Render the bar with a spy on saving and one on opening a snapshot.
 * @returns the save spy
 */
function mount(onOpenSnapshot: () => void = vi.fn()): ReturnType<typeof vi.fn> {
  const onSave = vi.fn()
  renderInEnglish(
    <AppBar
      name="Europe Historical Atlas Cartographer"
      year={1100}
      onSave={onSave}
      onOpenSnapshot={onOpenSnapshot}
    />
  )
  return onSave
}

describe('AppBar', () => {
  describe('happy path', () => {
    it('writes the name and the open year beside the mark', () => {
      mount()

      expect(document.querySelector('.app-brand > .brand-mark')).not.toBeNull()
      expect(document.querySelector('.app-brand__name')?.textContent).toBe(
        'Europe Historical Atlas Cartographer'
      )
      expect(document.querySelector('.app-brand__year')?.textContent).toBe('1100')
    })

    it('saves on [Save]', async () => {
      const onSave = mount()
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(onSave).toHaveBeenCalledOnce()
    })

    // s18, rung 2b: the button opens the dialogue, and only that — saving is not touched.
    it('calls onOpenSnapshot on [Open snapshot…], not onSave', async () => {
      const onOpenSnapshot = vi.fn()
      const onSave = mount(onOpenSnapshot)

      await userEvent.click(screen.getByRole('button', { name: 'Open snapshot…' }))

      expect(onOpenSnapshot).toHaveBeenCalledOnce()
      expect(onSave).not.toHaveBeenCalled()
      expect(
        screen.getByRole('button', { name: 'Open snapshot…' }).getAttribute('aria-disabled')
      ).toBeNull()
    })
  })

  describe('variants', () => {
    it('lays out the design’s actions, in its order, [Open snapshot…] after [Open…], without [Export for the atlas…]', () => {
      mount()
      const labels = screen.getAllByRole('button').map((button) => button.textContent)
      expect(labels).toEqual(['Open…', 'Open snapshot…', 'Save', 'Save as…', 'Registry'])
    })
  })

  describe('managed errors', () => {
    it('marks every unbuilt action unavailable, naming the scenario it waits for', () => {
      mount()
      for (const [name, scenario] of [
        ['Open…', 's01'],
        ['Save as…', 's04'],
        ['Registry', 's07'],
      ] as const) {
        const button = screen.getByRole('button', { name })
        expect(button.getAttribute('aria-disabled')).toBe('true')
        expect(button.getAttribute('title')).toContain(scenario)
      }
      expect(screen.getByRole('button', { name: 'Save' }).getAttribute('aria-disabled')).toBeNull()
    })
  })

  // L4: N/A — a view; what saving can fail on is the year session's, said in the status bar.

  describe('edge cases', () => {
    it('is not a heading: the page’s one <h1> stays in the canvas landmark', () => {
      mount()
      expect(document.querySelector('h1, h2, [role="heading"]')).toBeNull()
    })
  })
})
