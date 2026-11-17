import { hsvaToHex } from '@fubaritico/behaviors'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { ActiveSwatch } from './ActiveSwatch'

import type { SwatchPolity } from './SwatchPicker'

const FRANCE: SwatchPolity = {
  name: 'Reaume de France',
  colour: '#54719b',
  picked: { h: 215, s: 46, v: 61, a: 1 },
}

/** A colour that is not France's, should the fixture ever lose its own. */
const RED = { h: 0, s: 100, v: 100, a: 1 }

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
  renderInEnglish(<ActiveSwatch polity={polity} onColour={onColour} defaultOpen={defaultOpen} />)
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
      await user.click(screen.getByRole('radio', { name: 'Automatic' }))
      expect(onColour).toHaveBeenCalledWith(null)
    })

    // CARTO-465, the dev, 2026-11-17: copy a polity's colour, select another, paste it
    it('hands the document a colour pasted from the clipboard', async () => {
      const { onColour, user } = mount({ ...FRANCE, picked: null }, true)
      await navigator.clipboard.writeText('#ff0000')
      await user.click(screen.getByRole('button', { name: 'Paste color' }))
      // The paste reads the clipboard asynchronously: the colour arrives after the click has returned
      await waitFor(() => {
        expect(onColour).toHaveBeenCalledWith({ h: 0, s: 100, v: 100, a: 1 })
      })
    })

    it('copies the polity’s colour to the clipboard', async () => {
      const { user } = mount(FRANCE, true)
      await user.click(screen.getByRole('button', { name: 'Copy color' }))
      expect(await navigator.clipboard.readText()).toBe(hsvaToHex(FRANCE.picked ?? RED))
    })
  })

  describe('variants', () => {
    it('names the picker after the polity, and starts it from the polity’s colour', () => {
      mount(FRANCE, true)
      expect(screen.getByRole('dialog', { name: 'Colour of Reaume de France' })).toBeDefined()
      expect(screen.getByRole('radio', { name: 'Automatic', checked: false })).toBeDefined()
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
      expect(screen.getByRole('radio', { name: 'Automatic', checked: true })).toBeDefined()
    })
  })
})
