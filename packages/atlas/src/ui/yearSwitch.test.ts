import { afterEach, describe, expect, it, vi } from 'vitest'

import { mountYearSwitch } from './yearSwitch'

import type { YearSwitch, YearSwitchDeps } from './yearSwitch'

afterEach(() => {
  document.body.replaceChildren()
})

/** The year shown and the year asked, as the atlas's store holds them. */
interface Years {
  shown: number | null
  asked: number | null
}

/**
 * A switch over 1100 and 1200, showing 1100, whose pick asks the year as the store does.
 * @param overrides - what replaces the default deps
 * @returns the switch, the years it reads, and the pick
 */
function setup(overrides: Partial<YearSwitchDeps> = {}): {
  yearSwitch: YearSwitch
  element: HTMLElement
  years: Years
  pick: ReturnType<typeof vi.fn>
} {
  const years: Years = { shown: 1100, asked: null }
  const pick = vi.fn((year: number) => {
    years.asked = year
  })
  const yearSwitch = mountYearSwitch({
    host: document.body,
    years: [1100, 1200],
    current: () => years.shown,
    busy: () => years.asked !== null,
    pick,
    label: 'Changer d’année',
    ...overrides,
  })
  return { yearSwitch, element: yearSwitch.element, years, pick }
}

const button = (element: HTMLElement, year: number): HTMLButtonElement => {
  const found = element.querySelector<HTMLButtonElement>(`button[data-year="${String(year)}"]`)
  if (!found) throw new Error(`no button for ${String(year)}`)
  return found
}

const refused = (element: HTMLElement, year: number): string | null =>
  button(element, year).getAttribute('aria-disabled')

// ATLAS-333, the dev, 2026-11-02: a temporary element to go from one year to the other; through the store since
// ATLAS-392.
describe('the year switch', () => {
  describe('happy path', () => {
    it('shows one button per year, the shown year pressed, under its name', () => {
      const { element } = setup()
      expect(element.getAttribute('aria-label')).toBe('Changer d’année')
      expect([...element.querySelectorAll('button')].map((b) => b.textContent)).toEqual([
        '1100',
        '1200',
      ])
      expect(button(element, 1100).getAttribute('aria-pressed')).toBe('true')
      expect(button(element, 1200).getAttribute('aria-pressed')).toBe('false')
    })

    it('asks 1200 on its click, and presses it once the year is shown and the request over', () => {
      const { yearSwitch, element, years, pick } = setup()
      button(element, 1200).click()
      expect(pick).toHaveBeenCalledWith(1200)
      years.shown = 1200
      years.asked = null
      yearSwitch.refresh()
      expect(button(element, 1200).getAttribute('aria-pressed')).toBe('true')
      expect(refused(element, 1100)).toBe('false')
    })
  })

  describe('variants', () => {
    it('refuses its buttons while a year asked elsewhere — the dev panel — is drawn', () => {
      const { yearSwitch, element, years } = setup()
      years.asked = 1200
      yearSwitch.refresh()
      expect(element.getAttribute('aria-busy')).toBe('true')
      expect([refused(element, 1100), refused(element, 1200)]).toEqual(['true', 'true'])
    })
  })

  describe('managed errors', () => {
    it('gives the buttons back on the year still drawn when a request fails', () => {
      const { yearSwitch, element, years } = setup()
      button(element, 1200).click()
      years.asked = null // the request is over, the map left on 1100
      yearSwitch.refresh()
      expect(button(element, 1100).getAttribute('aria-pressed')).toBe('true')
      expect(refused(element, 1200)).toBe('false')
    })
  })

  // L4: N/A — the switch only asks; drawing, and its failures, are the bridge's (`app/yearBridge.test.ts`).

  describe('edge cases', () => {
    it('refuses every button while a year is drawn, so a second click asks nothing, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { yearSwitch, element, pick } = setup()
      button(element, 1200).click()
      yearSwitch.refresh()
      expect([refused(element, 1100), refused(element, 1200)]).toEqual(['true', 'true'])
      button(element, 1100).click()
      expect(pick).toHaveBeenCalledTimes(1)
      // Refused, not disabled: the button the keyboard pressed keeps the focus (review A11Y-001).
      expect(button(element, 1200).disabled).toBe(false)
      expect(warn).toHaveBeenCalledTimes(1)
      warn.mockRestore()
    })

    it('asks nothing on a click between two buttons', () => {
      const { element, pick } = setup()
      element.click()
      expect(pick).not.toHaveBeenCalled()
    })

    it('presses no button before a year is drawn', () => {
      const { element } = setup({ current: () => null })
      expect(button(element, 1100).getAttribute('aria-pressed')).toBe('false')
    })

    it('leaves the page on dispose', () => {
      const { element: mounted } = setup()
      expect(document.body.contains(mounted)).toBe(true)
      const second = mountYearSwitch({
        host: document.body,
        years: [1100],
        current: () => 1100,
        busy: () => false,
        pick: () => undefined,
        label: 'x',
      })
      second.dispose()
      expect(document.body.contains(second.element)).toBe(false)
    })
  })
})
