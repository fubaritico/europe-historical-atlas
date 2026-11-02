import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { AppBar } from './AppBar'

import type { AppBarProps } from './AppBar'

/** The bar's four gestures, each a spy. */
type Gestures = Pick<AppBarProps, 'onOpen' | 'onSave' | 'onSaveAs' | 'onSaveCopy'>

/**
 * Render the bar on a map, every gesture a spy.
 * @param map - the map open
 * @returns the spies
 */
function mount(map = '1100'): Record<keyof Gestures, ReturnType<typeof vi.fn>> {
  const spies = { onOpen: vi.fn(), onSave: vi.fn(), onSaveAs: vi.fn(), onSaveCopy: vi.fn() }
  renderInEnglish(<AppBar name="Europe Historical Atlas Cartographer" map={map} {...spies} />)
  return spies
}

/**
 * The gestures called so far, by name.
 * @param spies - the spies
 * @returns the names of the spies called
 */
function called(spies: Record<string, ReturnType<typeof vi.fn>>): string[] {
  return Object.entries(spies)
    .filter(([, spy]) => spy.mock.calls.length > 0)
    .map(([name]) => name)
}

describe('AppBar', () => {
  describe('happy path', () => {
    it('writes the name and the open map beside the mark', () => {
      mount()

      expect(document.querySelector('.app-brand > .brand-mark')).not.toBeNull()
      expect(document.querySelector('.app-brand__name')?.textContent).toBe(
        'Europe Historical Atlas Cartographer'
      )
      expect(document.querySelector('.app-brand__year')?.textContent).toBe('1100')
    })

    // s19: each button calls its own gesture, and only it.
    it.each([
      ['Open…', 'onOpen'],
      ['Save', 'onSave'],
      ['Save as…', 'onSaveAs'],
      ['Save a copy', 'onSaveCopy'],
    ])('calls only its gesture on [%s]', async (label, gesture) => {
      const spies = mount()
      await userEvent.click(screen.getByRole('button', { name: label }))
      expect(called(spies)).toEqual([gesture])
    })
  })

  describe('variants', () => {
    it('lays out the four gestures on a map, then the registry, with no [Open snapshot…]', () => {
      mount()
      const labels = screen.getAllByRole('button').map((button) => button.textContent)
      expect(labels).toEqual(['Open…', 'Save', 'Save as…', 'Save a copy', 'Registry'])
    })

    it('writes a working map’s name as it is', () => {
      mount('1100-backup-2026-11-02')
      expect(document.querySelector('.app-brand__year')?.textContent).toBe('1100-backup-2026-11-02')
    })
  })

  describe('managed errors', () => {
    it('marks the registry unavailable, naming its scenario, and the four gestures available', () => {
      mount()
      const registry = screen.getByRole('button', { name: 'Registry' })
      expect(registry.getAttribute('aria-disabled')).toBe('true')
      expect(registry.getAttribute('title')).toContain('s07')
      for (const name of ['Open…', 'Save', 'Save as…', 'Save a copy'])
        expect(screen.getByRole('button', { name }).getAttribute('aria-disabled')).toBeNull()
    })
  })

  // L4: N/A — a view; what the gestures can fail on is the session's, said in a toast or the alarm.

  describe('edge cases', () => {
    it('is not a heading: the page’s one <h1> stays in the canvas landmark', () => {
      mount()
      expect(document.querySelector('h1, h2, [role="heading"]')).toBeNull()
    })
  })
})
