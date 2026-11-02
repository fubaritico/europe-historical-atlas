/**
 * The panel's tribes controls.
 */

import { TRIBE_CONTROLS, TRIBE_CONTROL_ORDER } from '../../tunables/params'
import { addControl, noEffect } from '../addControl'

import type { DevPanelDeps } from '../panelContract'
import type GUI from 'lil-gui'

/**
 * The tribes' limit — the band, a fade inside or outside, and its width. Each is written to a uniform, read at each
 * frame; the mode also lays the tribes again, since a colour that spills (`outset`) measures its neighbours' ground
 * and one that stays inside does not (`tribePatches`).
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
export function addTribeFolder(gui: GUI, deps: DevPanelDeps): void {
  const folder = gui.addFolder('tribes (vanishing edge)')
  for (const key of TRIBE_CONTROL_ORDER)
    addControl(
      folder,
      deps.tribes,
      key,
      TRIBE_CONTROLS[key],
      key === 'mode' ? deps.callbacks.rebuildFills : noEffect
    )
  folder.close()
}
