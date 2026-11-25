import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { AppBar } from './AppBar'

/**
 * Render the bar on a map, a menu bar and an account standing in for theirs.
 * @param map - the map open, or `null` on the start screen
 */
function mount(map: string | null = '1100'): void {
  renderInEnglish(
    <AppBar
      name="Europe Historical Atlas Cartographer"
      map={map}
      menus={<div data-testid="menus" />}
      account={<span data-testid="account" />}
    />
  )
}

describe('AppBar', () => {
  describe('happy path', () => {
    // CARTO-555: the mark and the menus at the left end, the name in the middle, the account at the right end.
    it('lays the mark with the menus against it, then the name, then the account', () => {
      mount()

      const parts = [...(document.body.firstElementChild?.children ?? [])].map(
        (part) => part.className
      )
      expect(parts).toEqual(['app-start', 'app-brand', 'bar-actions'])
      expect(
        document.querySelector('.app-start > .brand-mark + [data-testid="menus"]')
      ).not.toBeNull()
      expect(document.querySelector('.bar-actions > [data-testid="account"]')).not.toBeNull()
    })

    it('writes the name and the map open in the middle, without the mark', () => {
      mount()

      expect(document.querySelector('.app-brand__name')?.textContent).toBe(
        'Europe Historical Atlas Cartographer'
      )
      expect(document.querySelector('.app-brand__year')?.textContent).toBe('1100')
      expect(document.querySelector('.app-brand .brand-mark')).toBeNull()
    })
  })

  describe('variants', () => {
    it('writes a working map’s name as it is', () => {
      mount('1100-backup-2026-11-02')
      expect(document.querySelector('.app-brand__year')?.textContent).toBe('1100-backup-2026-11-02')
    })

    it('writes the name alone on the start screen, no map open', () => {
      mount(null)
      expect(document.querySelector('.app-brand')?.textContent).toBe(
        'Europe Historical Atlas Cartographer'
      )
    })
  })

  describe('managed errors', () => {
    // CARTO-555: the four file buttons doubled the menu Fichier — gone, the menu and the keys keep their gestures.
    it('holds no file button: no « Open… », « Save », « Save as… » nor « Save a copy »', () => {
      mount()
      expect(screen.queryAllByRole('button')).toEqual([])
    })
  })

  // L4: N/A — a view of what it is handed.

  describe('edge cases', () => {
    it('is not a heading: the page’s one <h1> stays in the canvas landmark', () => {
      mount()
      expect(document.querySelector('h1, h2, [role="heading"]')).toBeNull()
    })
  })
})
