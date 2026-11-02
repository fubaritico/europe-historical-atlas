import { afterEach, describe, expect, it, vi } from 'vitest'

import { NO_DEV_TOOLS, isPanelToggle, mountDevTools } from './devTools'

import type { DevPanelDeps } from './panelContract'

// The panel itself has its own tests (`devPanel.test`): here it is a stand-in, so only the mounting is under test.
const gui = {
  _hidden: false,
  destroy: vi.fn(),
  hide: vi.fn(() => {
    gui._hidden = true
  }),
  show: vi.fn((show: boolean) => {
    gui._hidden = !show
  }),
  updateDisplay: vi.fn(),
  controllersRecursive: (): { updateDisplay: () => void }[] => [
    { updateDisplay: gui.updateDisplay },
  ],
}
vi.mock('./devPanel', () => ({ createDevPanel: () => gui }))
// The counter draws on a canvas jsdom does not have: a stand-in with its element.
vi.mock('three/addons/libs/stats.module.js', () => ({
  default: class {
    dom = document.createElement('div')
  },
}))

const press = (target: EventTarget, init: KeyboardEventInit): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', init))
}

afterEach(() => {
  gui._hidden = false
  vi.clearAllMocks()
  document.body.replaceChildren()
})

// ATLAS-317, the dev, 2026-10-29: the settings' panel and the frame counter in development, never deployed.
// ATLAS-333, the dev, 2026-11-02: the panel opens hidden, ‹H› shows or hides it.
describe('the developer’s tools', () => {
  describe('happy path', () => {
    it('shows the frame counter on the page, and takes it and the panel off again', () => {
      const host = document.createElement('div')
      const tools = mountDevTools({} as DevPanelDeps, host, new EventTarget() as Window)
      expect(host.childElementCount).toBe(1)
      tools.dispose()
      expect([host.childElementCount, gui.destroy.mock.calls.length]).toEqual([0, 1])
    })

    it('opens the panel hidden, and h shows it then hides it again', () => {
      const keys = new EventTarget()
      mountDevTools({} as DevPanelDeps, document.createElement('div'), keys as Window)
      expect(gui._hidden).toBe(true)
      press(keys, { key: 'h' })
      expect(gui._hidden).toBe(false)
      press(keys, { key: 'H' })
      expect(gui._hidden).toBe(true)
    })

    it('redraws every control on refresh', () => {
      const tools = mountDevTools(
        {} as DevPanelDeps,
        document.createElement('div'),
        new EventTarget() as Window
      )
      tools.refresh()
      expect(gui.updateDisplay).toHaveBeenCalledTimes(1)
    })
  })

  describe('variants', () => {
    it('counts no frame, redraws nothing and takes nothing off the page when none is mounted, on the deployed site', () => {
      expect(() => {
        NO_DEV_TOOLS.stats.update()
        NO_DEV_TOOLS.refresh()
        NO_DEV_TOOLS.dispose()
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('does not toggle on ctrl+h, cmd+h, alt+h or another key', () => {
      for (const init of [
        { key: 'h', ctrlKey: true },
        { key: 'h', metaKey: true },
        { key: 'h', altKey: true },
        { key: 'g' },
      ])
        expect(isPanelToggle(new KeyboardEvent('keydown', init))).toBe(false)
    })

    it('does not toggle on h typed into a field', () => {
      const field = document.createElement('input')
      document.body.append(field)
      field.focus()
      expect(isPanelToggle(new KeyboardEvent('keydown', { key: 'h' }))).toBe(false)
    })

    it('stops listening for h once disposed', () => {
      const keys = new EventTarget()
      const tools = mountDevTools({} as DevPanelDeps, document.createElement('div'), keys as Window)
      tools.dispose()
      press(keys, { key: 'h' })
      expect(gui.show).not.toHaveBeenCalled()
    })
  })

  // L4: N/A — a key press and a panel.
  // L5: N/A — the deployed bundle's lack of the panel is checked by building it (ATLAS-317), not by a unit test.
})
