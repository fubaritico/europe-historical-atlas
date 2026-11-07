import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { CityName } from './CityName'

/**
 * Troyes' name, chosen or not, its two callbacks spied.
 * @param chosen - whether Troyes is the city chosen
 * @returns the callbacks and a user
 */
function mount(chosen = false) {
  const onSelect = vi.fn()
  const onOpen = vi.fn()
  renderInEnglish(
    <CityName id="troyes" name="Troyes" chosen={chosen} onSelect={onSelect} onOpen={onOpen} />
  )
  return {
    onSelect,
    onOpen,
    user: userEvent.setup(),
    name: screen.getByRole('button', { name: 'Troyes' }),
  }
}

// CARTO-384, the dev, 2026-11-07: a click on a city's name chooses it; a double-click opens its information box.
describe('CityName', () => {
  describe('happy path', () => {
    it('chooses Troyes on a click', async () => {
      const { onSelect, onOpen, user, name } = mount()
      await user.click(name)
      expect(onSelect).toHaveBeenCalledWith('troyes')
      expect(onOpen).not.toHaveBeenCalled()
    })

    it("opens Troyes' box on a double-click", async () => {
      const { onOpen, user, name } = mount()
      await user.dblClick(name)
      expect(onOpen).toHaveBeenCalledWith('troyes')
    })
  })

  describe('variants', () => {
    it("opens Troyes' box on ‹enter›, its name focused", async () => {
      const { onOpen, user, name } = mount()
      name.focus()
      await user.keyboard('{Enter}')
      expect(onOpen).toHaveBeenCalledWith('troyes')
    })

    // The dev's Chrome, 2026-11-07: the box opened takes the focus, and the click the browser sends for ‹enter›
    // landed on its « Fermer ». The key must keep that click from following.
    it('sends no click after ‹enter›: the button is not chosen again', async () => {
      const { onSelect, onOpen, user, name } = mount()
      name.focus()
      await user.keyboard('{Enter}')
      expect(onOpen).toHaveBeenCalledOnce()
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('says Troyes is the city chosen', () => {
      const { name } = mount(true)
      expect(name.getAttribute('aria-current')).toBe('true')
    })

    it('says nothing of a city not chosen', () => {
      const { name } = mount(false)
      expect(name.getAttribute('aria-current')).toBeNull()
    })
  })

  // L3–L4: N/A — a button that hands its id back; nothing can fail.

  describe('edge cases', () => {
    it('opens nothing on another key, ‹space› choosing as a click does', async () => {
      const { onSelect, onOpen, user, name } = mount()
      name.focus()
      await user.keyboard('a')
      expect(onOpen).not.toHaveBeenCalled()
      await user.keyboard(' ')
      expect(onSelect).toHaveBeenCalledWith('troyes')
    })
  })
})
