import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ActiveSwatch } from './ActiveSwatch'

import type { SwatchPolity } from './SwatchPicker'

const FRANCE: SwatchPolity = {
  name: 'Reaume de France',
  colour: '#54719b',
  picked: { h: 215, s: 46, v: 61, a: 1 },
}

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Render the swatch with a spy on the colour chosen.
 * @param polity - the polity aimed at, or `null`
 * @param defaultOpen - the picker open from the start: jsdom cannot click a `popovertarget` open
 * @returns the spy and a user
 */
function mount(polity: SwatchPolity | null = FRANCE, defaultOpen = false) {
  const onColour = vi.fn()
  render(<ActiveSwatch polity={polity} onColour={onColour} defaultOpen={defaultOpen} />)
  return { onColour, user: userEvent.setup() }
}

describe('ActiveSwatch', () => {
  describe('happy path', () => {
    // The click that opens it is the browser's `popovertarget`, absent from jsdom: walked in Chrome instead.
    it('shows the polity’s colour on a button that opens the picker', () => {
      mount()
      const swatch = screen.getByRole('button', { name: 'Colour of Reaume de France' })

      expect(swatch.getAttribute('style')).toContain('background')
      expect(swatch.getAttribute('aria-haspopup')).toBe('dialog')
      expect(swatch.getAttribute('popovertarget')).not.toBeNull()
    })

    it('hands "automatic" to the document when the picker’s gesture ends on it', async () => {
      const { onColour, user } = mount(FRANCE, true)
      await user.click(screen.getByRole('button', { name: 'Automatic' }))
      expect(onColour).toHaveBeenCalledWith(null)
    })
  })

  describe('variants', () => {
    it('names the picker after the polity, and starts it from the polity’s colour', () => {
      mount(FRANCE, true)
      expect(screen.getByRole('dialog', { name: 'Colour of Reaume de France' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'Automatic' }).getAttribute('aria-pressed')).toBe(
        'false'
      )
    })
  })

  describe('managed errors', () => {
    it('refuses with nobody aimed at: struck through, says why, warns on a click', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { onColour, user } = mount(null)
      const swatch = screen.getByRole('button', { name: 'Active polity — none selected' })

      expect(swatch.getAttribute('data-empty')).toBe('true')
      expect(swatch.getAttribute('aria-disabled')).toBe('true')
      expect(swatch.getAttribute('title')).toContain('select a polity')
      await user.click(swatch)
      expect(warn).toHaveBeenCalledOnce()
      expect(onColour).not.toHaveBeenCalled()
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  // L4: N/A — a view; what the document refuses is said by the binding, tested in ToolRail.test.tsx.

  describe('edge cases', () => {
    it('opens on "automatic" when the polity has no colour of its own', () => {
      mount({ ...FRANCE, picked: null }, true)
      expect(screen.getByRole('button', { name: 'Automatic' }).getAttribute('aria-pressed')).toBe(
        'true'
      )
    })
  })
})
