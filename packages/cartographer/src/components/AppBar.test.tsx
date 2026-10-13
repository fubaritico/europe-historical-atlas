import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AppBar } from './AppBar'

/**
 * Render the bar with a spy on saving.
 * @returns the save spy
 */
function mount(): ReturnType<typeof vi.fn> {
  const onSave = vi.fn()
  render(<AppBar name="Europe Historical Atlas Cartographer" year={1100} onSave={onSave} />)
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
  })

  describe('variants', () => {
    it('lays out the design’s actions, in its order, without [Export for the atlas…]', () => {
      mount()
      const labels = screen.getAllByRole('button').map((button) => button.textContent)
      expect(labels).toEqual(['Open…', 'Save', 'Save as…', 'Registry'])
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
