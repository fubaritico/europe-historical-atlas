import { afterEach, describe, expect, it, vi } from 'vitest'

import { mountYearSwitch } from './yearSwitch'

import type { YearSwitchDeps } from './yearSwitch'

afterEach(() => {
  document.body.replaceChildren()
})

/** A switch over 1100 and 1200, showing 1100, whose pick resolves when told. */
function setup(overrides: Partial<YearSwitchDeps> = {}): {
  element: HTMLElement
  shown: { year: number }
  settle: () => void
  pick: ReturnType<typeof vi.fn>
} {
  const shown = { year: 1100 }
  let settle = (): void => undefined
  const pick = vi.fn(
    (year: number) =>
      new Promise<void>((resolve) => {
        shown.year = year
        settle = resolve
      })
  )
  const { element } = mountYearSwitch({
    host: document.body,
    years: [1100, 1200],
    current: () => shown.year,
    pick,
    label: 'Changer d’année',
    ...overrides,
  })
  return {
    element,
    shown,
    settle: () => {
      settle()
    },
    pick,
  }
}

const button = (element: HTMLElement, year: number): HTMLButtonElement => {
  const found = element.querySelector<HTMLButtonElement>(`button[data-year="${String(year)}"]`)
  if (!found) throw new Error(`no button for ${String(year)}`)
  return found
}

/** Node's process, which runs these tests — the atlas has no Node types, so only what is used is declared. */
const nodeProcess = (
  globalThis as unknown as {
    process: {
      on: (name: 'unhandledRejection', listener: (reason: unknown) => void) => void
      off: (name: 'unhandledRejection', listener: (reason: unknown) => void) => void
    }
  }
).process

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

// ATLAS-333, the dev, 2026-11-02: a temporary element to go from one year to the other.
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

    it('picks 1200 on its click, and presses it once the map is drawn', async () => {
      const { element, pick, settle } = setup()
      button(element, 1200).click()
      expect(pick).toHaveBeenCalledWith(1200)
      settle()
      await flush()
      expect(button(element, 1200).getAttribute('aria-pressed')).toBe('true')
      expect(button(element, 1100).getAttribute('aria-disabled')).toBe('false')
    })
  })

  describe('edge cases', () => {
    it('refuses every button while a year loads, so a second click starts nothing, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { element, pick } = setup()
      button(element, 1200).click()
      const refused = (year: number) => button(element, year).getAttribute('aria-disabled')
      expect([refused(1100), refused(1200)]).toEqual(['true', 'true'])
      button(element, 1100).click()
      expect(pick).toHaveBeenCalledTimes(1)
      // Refused, not disabled: the button the keyboard pressed keeps the focus (review A11Y-001).
      expect(button(element, 1200).disabled).toBe(false)
      expect(warn).toHaveBeenCalledTimes(1)
      warn.mockRestore()
    })

    it('starts nothing on a click between two buttons', () => {
      const { element, pick } = setup()
      element.click()
      expect(pick).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('gives the buttons back when a pick fails, and lets the failure through to the error net', async () => {
      const failure = new Error('year failed')
      const rejections: unknown[] = []
      const onRejection = (reason: unknown): void => {
        rejections.push(reason)
      }
      nodeProcess.on('unhandledRejection', onRejection)
      const { element } = setup({ pick: () => Promise.reject(failure) })
      button(element, 1200).click()
      await flush()
      await flush()
      nodeProcess.off('unhandledRejection', onRejection)
      expect(button(element, 1200).getAttribute('aria-disabled')).toBe('false')
      expect(rejections).toEqual([failure])
    })
  })

  describe('variants, teardown', () => {
    it('leaves the page on dispose', () => {
      const { element: mounted } = setup()
      expect(document.body.contains(mounted)).toBe(true)
      const second = mountYearSwitch({
        host: document.body,
        years: [1100],
        current: () => 1100,
        pick: () => Promise.resolve(),
        label: 'x',
      })
      second.dispose()
      expect(document.body.contains(second.element)).toBe(false)
    })
  })
})
