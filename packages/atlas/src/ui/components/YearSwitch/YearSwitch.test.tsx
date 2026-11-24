import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createAtlasStore, interfaceSideOf } from '../../../state/atlasStore'

import { YearSwitch } from './YearSwitch'

/**
 * A switch over a store whose map has started on 1100, with 1100, 1200 and 1300.
 * @returns the store and the rendered switch's group
 */
function setup() {
  const store = createAtlasStore()
  store.getState().started([1100, 1200, 1300], 1100)
  render(<YearSwitch side={interfaceSideOf(store)} label="Changer d’année" />)
  return { store, group: screen.getByRole('group', { name: 'Changer d’année' }) }
}

const button = (year: number): HTMLElement => screen.getByRole('button', { name: String(year) })

// ATLAS-333's temporary switch, in React over the atlas's store since ATLAS-519.
describe('YearSwitch', () => {
  describe('happy path', () => {
    it('shows one button per year that has a map, the year shown pressed, under its name', () => {
      setup()
      expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
        '1100',
        '1200',
        '1300',
      ])
      expect(button(1100).getAttribute('aria-pressed')).toBe('true')
      expect(button(1200).getAttribute('aria-pressed')).toBe('false')
    })

    it('requests 1200 on its click, and presses it once the map has drawn it', async () => {
      const { store } = setup()
      await userEvent.click(button(1200))
      const request = store.getState().requested
      expect(request?.year).toBe(1200)
      act(() => {
        if (request) store.getState().yearSettled(request.serial, 1200)
      })
      expect(button(1200).getAttribute('aria-pressed')).toBe('true')
      expect(button(1100).getAttribute('aria-disabled')).toBe('false')
    })
  })

  describe('variants', () => {
    it('refuses its buttons while a year requested elsewhere — the dev panel — is drawn', () => {
      const { store, group } = setup()
      act(() => {
        store.getState().requestYear(1300)
      })
      expect(group.getAttribute('aria-busy')).toBe('true')
      expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-disabled'))).toEqual([
        'true',
        'true',
        'true',
      ])
    })
  })

  describe('managed errors', () => {
    it('gives the buttons back on the year still drawn when a request fails', async () => {
      const { store } = setup()
      await userEvent.click(button(1200))
      act(() => {
        const request = store.getState().requested
        if (request) store.getState().yearSettled(request.serial, 1100)
      })
      expect(button(1100).getAttribute('aria-pressed')).toBe('true')
      expect(button(1200).getAttribute('aria-disabled')).toBe('false')
    })
  })

  // L4: N/A — the switch only requests; drawing, and its failures, are the bridge's (`app/yearBridge.test.ts`).

  describe('edge cases', () => {
    it('refuses every click while a year is drawn, so a second click requests nothing, and says so', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { store } = setup()
      await userEvent.click(button(1200))
      const first = store.getState().requested
      await userEvent.click(button(1300))
      expect(store.getState().requested).toBe(first)
      // Refused, not disabled: the button the keyboard pressed keeps the focus (review A11Y-001 of ATLAS-333).
      expect((button(1200) as HTMLButtonElement).disabled).toBe(false)
      expect(warn).toHaveBeenCalledTimes(1)
      warn.mockRestore()
    })

    it('shows nothing before the map has said which years it has', () => {
      render(<YearSwitch side={interfaceSideOf(createAtlasStore())} label="Changer d’année" />)
      expect(screen.queryAllByRole('button')).toEqual([])
    })
  })
})
