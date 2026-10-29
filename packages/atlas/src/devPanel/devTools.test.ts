import { describe, expect, it, vi } from 'vitest'

import { NO_DEV_TOOLS, mountDevTools } from './devTools'

import type { DevPanelDeps } from './panelContract'

// The panel itself has its own tests (`devPanel.test`): here it is a stand-in, so only the mounting is under test.
const destroy = vi.fn()
vi.mock('./devPanel', () => ({ createDevPanel: () => ({ destroy }) }))
// The counter draws on a canvas jsdom does not have: a stand-in with its element.
vi.mock('three/addons/libs/stats.module.js', () => ({
  default: class {
    dom = document.createElement('div')
  },
}))

// ATLAS-317, the dev, 2026-10-29: the settings' panel and the frame counter in development, never deployed.
describe('the developer’s tools', () => {
  describe('happy path', () => {
    it('shows the frame counter on the page, and takes it and the panel off again', () => {
      const host = document.createElement('div')
      const tools = mountDevTools({} as DevPanelDeps, host)
      expect(host.childElementCount).toBe(1)
      tools.dispose()
      expect([host.childElementCount, destroy.mock.calls.length]).toEqual([0, 1])
    })
  })

  describe('variants', () => {
    it('counts no frame and takes nothing off the page when none is mounted, on the deployed site', () => {
      expect(() => {
        NO_DEV_TOOLS.stats.update()
        NO_DEV_TOOLS.dispose()
      }).not.toThrow()
    })
  })

  // L3, L4: N/A — mounting two tools on an element.
  // L5: N/A — the deployed bundle's lack of the panel is checked by building it (ATLAS-317), not by a unit test.
})
