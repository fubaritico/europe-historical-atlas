import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { ColourField } from './ColourField'

import type { ColorValue } from '@fubaritico/behaviors'

const RED = { h: 0, s: 100, v: 100, a: 1 }

/**
 * Mount the field on a value and open its picker.
 * @param value - the polity's colour, `null` for "automatic", or « no colour »
 * @returns what the field reports, and a user
 */
async function openOn(value: ColorValue) {
  const onChange = vi.fn<(colour: ColorValue) => void>()
  const user = userEvent.setup()
  renderInEnglish(<ColourField value={value} onChange={onChange} />)
  await user.click(screen.getByRole('button', { name: /^Choose color/ }))
  return { onChange, user }
}

/**
 * The mode a radio of the picker stands for. Asked for hidden or not: jsdom has no popover, so the picker's panel
 * stays out of the accessibility tree there.
 * @param name - « Color », « Automatic » or « None »
 * @returns the radio
 */
function mode(name: string): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>('radio', { name, hidden: true })
}

// CARTO-484, the dev, 2026-11-18: a people known by its name alone — a zone with no fill, no edge, its name only.
describe('ColourField', () => {
  describe('happy path', () => {
    it('offers three states: a colour, automatic, none', async () => {
      await openOn(null)
      expect(
        screen
          .getAllByRole('radio', { hidden: true })
          .map((radio) => radio.getAttribute('aria-label') ?? radio.parentElement?.textContent)
      ).toEqual(['Color', 'Automatic', 'None'])
    })

    it('reports « no colour » when « None » is chosen', async () => {
      const { onChange, user } = await openOn(null)
      await user.click(mode('None'))
      expect(onChange).toHaveBeenLastCalledWith('none')
    })
  })

  describe('variants', () => {
    it('opens on « None » for a polity with no colour', async () => {
      await openOn('none')
      expect([mode('None').checked, mode('Automatic').checked]).toEqual([true, false])
    })

    it('opens on « Automatic » for a polity the palette colours', async () => {
      await openOn(null)
      expect([mode('Automatic').checked, mode('None').checked]).toEqual([true, false])
    })

    it('opens on « Color » for a polity with a colour of its own', async () => {
      await openOn(RED)
      expect(mode('Color').checked).toBe(true)
    })

    it('reports automatic when « Automatic » is chosen over « no colour »', async () => {
      const { onChange, user } = await openOn('none')
      await user.click(mode('Automatic'))
      expect(onChange).toHaveBeenLastCalledWith(null)
    })
  })

  // L3, L4: N/A — the field forwards what the design system's picker hands; the picker's own cases are tested upstream.

  describe('edge cases', () => {
    it('reports a colour again when « Color » is chosen over « no colour »', async () => {
      const { onChange, user } = await openOn('none')
      await user.click(mode('Color'))
      const last = onChange.mock.lastCall?.[0]
      expect(last !== null && last !== 'none' && typeof last === 'object').toBe(true)
    })
  })
})
