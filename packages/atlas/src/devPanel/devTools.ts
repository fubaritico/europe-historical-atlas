/**
 * The developer's tools on the page — the settings' panel (lil-gui) and the frame counter — shown in development only
 * (ATLAS-317, the dev, 2026-10-29: *« moi je suis en dev, ça apparaît. Je voudrais qu'une fois déployé, ça
 * n'apparaisse plus »*). Which is which is the composition root's to say, from Vite's `import.meta.env.DEV`: true
 * under `pnpm dev`, false in the build the site is deployed from — written there as the condition itself, so the build
 * drops this module, lil-gui and the counter from the deployed bundle.
 */

import Stats from 'three/addons/libs/stats.module.js'

import { createDevPanel } from './devPanel'

import type { DevPanelDeps } from './panelContract'

/** The tools mounted on the page, or none. */
export interface DevTools {
  /** The frame counter the frame loop tells of each frame — counting nothing when the tools are not shown. */
  readonly stats: { update: () => void }
  /** Take the tools off the page. */
  dispose: () => void
}

/** No tools: frames counted by nobody, nothing to take off the page. */
export const NO_DEV_TOOLS: DevTools = {
  stats: {
    update(): void {
      // Nobody counts the frames outside development.
    },
  },
  dispose(): void {
    // Nothing was mounted.
  },
}

/**
 * Mount the settings' panel and the frame counter on the page.
 * @param panel - what the panel's controls read and call
 * @param host - where the counter is shown
 * @returns the tools
 */
export function mountDevTools(panel: DevPanelDeps, host: HTMLElement): DevTools {
  const gui = createDevPanel(panel)
  const stats = new Stats()
  host.appendChild(stats.dom)
  return {
    stats,
    dispose(): void {
      gui.destroy()
      stats.dom.remove()
    },
  }
}
