import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { AppBar } from './AppBar'

/**
 * Render the bar on a map, a menu bar and an account standing in for theirs.
 * @param map - the map open, or `null` on the start screen
 */
function mount(): void {
  renderInEnglish(
    <AppBar
      name="Europe Historical Atlas Cartographer"
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

    // The dev, 2026-11-25: the map open is not written beside the name — the document tab says it.
    it('writes the application’s name alone in the middle, without the mark nor the map', () => {
      mount()

      expect(document.querySelector('.app-brand')?.textContent).toBe(
        'Europe Historical Atlas Cartographer'
      )
      expect(document.querySelector('.app-brand .brand-mark')).toBeNull()
    })
  })

  // L2: N/A — the bar takes no map any more; it is the same with a map open or none.

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
