/**
 * The developer's tools on the page — the settings' panel (lil-gui) and the frame counter — shown in development only
 * (ATLAS-317, the dev, 2026-10-29: *« moi je suis en dev, ça apparaît. Je voudrais qu'une fois déployé, ça
 * n'apparaisse plus »*). Which is which is the composition root's to say, from Vite's `import.meta.env.DEV`: true
 * under `pnpm dev`, false in the build the site is deployed from — written there as the condition itself, so the build
 * drops this module, lil-gui and the counter from the deployed bundle.
 *
 * **The panel opens hidden, and ‹H› shows or hides it** (the dev, 2026-11-02, of the panel top right: *"that thing I
 * can no longer stand"*). Hidden rather than removed, so its settings stay one key away.
 */

import Stats from 'three/addons/libs/stats.module.js'

import { isEditableFocused } from '../utils/editableFocus'

import { createDevPanel } from './devPanel'

import type { DevPanelDeps } from './panelContract'

/** The key that shows or hides the settings' panel, in either case. */
export const PANEL_TOGGLE_KEY = 'h'

/** The tools mounted on the page, or none. */
export interface DevTools {
  /** The frame counter the frame loop tells of each frame — counting nothing when the tools are not shown. */
  readonly stats: { update: () => void }
  /** Redraw every control from its value — after a setting changed outside the panel (the year switch). */
  refresh: () => void
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
  refresh(): void {
    // No panel to redraw.
  },
  dispose(): void {
    // Nothing was mounted.
  },
}

/**
 * Whether a key press asks to show or hide the settings' panel: ‹H› alone, never typed into a field.
 * @param event - the key press
 * @returns `true` for the toggle
 */
export function isPanelToggle(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false
  if (event.key.toLowerCase() !== PANEL_TOGGLE_KEY) return false
  return !isEditableFocused()
}

/**
 * Mount the settings' panel, hidden, and the frame counter on the page.
 * @param panel - what the panel's controls read and call
 * @param host - where the counter is shown
 * @param keys - where ‹H› is listened for — the window
 * @returns the tools
 */
export function mountDevTools(
  panel: DevPanelDeps,
  host: HTMLElement,
  keys: Pick<Window, 'addEventListener' | 'removeEventListener'>
): DevTools {
  const gui = createDevPanel(panel)
  gui.hide()
  const stats = new Stats()
  host.appendChild(stats.dom)
  const onKey = (event: KeyboardEvent): void => {
    if (isPanelToggle(event)) gui.show(gui._hidden)
  }
  keys.addEventListener('keydown', onKey)
  return {
    stats,
    refresh(): void {
      for (const controller of gui.controllersRecursive()) controller.updateDisplay()
    },
    dispose(): void {
      keys.removeEventListener('keydown', onKey)
      gui.destroy()
      stats.dom.remove()
    },
  }
}
