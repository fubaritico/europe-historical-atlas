/**
 * The panel's political controls.
 */

import {
  POLITICAL_CONTROLS,
  POLITICAL_CONTROL_GROUPS,
  politicalRebuildFor,
} from '../../tunables/params'
import { addControl } from '../addControl'

import type { PoliticalRebuild } from '../../tunables/params'
import type { DevPanelDeps } from '../panelContract'
import type GUI from 'lil-gui'

/**
 * The historical political overlay.
 *
 * Which rebuild each tunable needs is declared in `tunables/params`, beside the control table itself, so it
 * can be walked key by key in a test — this panel has none, and that routing is exactly what broke
 * silently twice. Here we only turn that answer into a callback.
 *
 * Grouped like the texture folder: a flat list of twenty-odd tunables stops being a panel and becomes a
 * haystack, and the first thing lost is knowing which knob to reach for.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
export function addPoliticalFolder(gui: GUI, deps: DevPanelDeps): void {
  const { political, callbacks } = deps
  const folder = gui.addFolder('political (historical)')
  // Each kind of rebuild, mapped to the callback that performs it.
  const effects: Record<PoliticalRebuild, () => void> = {
    redraw: callbacks.rebuildBorders,
    trace: callbacks.rebuildBorderGeometry,
    full: callbacks.rebuildPolitical,
  }
  // One sub-folder per group; each control gets the rebuild declared for its key.
  for (const group of POLITICAL_CONTROL_GROUPS) {
    const sub = folder.addFolder(group.title)
    for (const key of group.keys)
      addControl(sub, political, key, POLITICAL_CONTROLS[key], effects[politicalRebuildFor(key)])
    sub.close()
  }
  folder.close()
}
