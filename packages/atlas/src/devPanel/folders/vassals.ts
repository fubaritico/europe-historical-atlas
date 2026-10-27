/**
 * The panel's vassals controls.
 */

import { VASSAL_CONTROLS, VASSAL_CONTROL_ORDER } from '../../tunables/params'
import { addControl, noEffect } from '../addControl'

import type { DevPanelDeps } from '../panelContract'
import type GUI from 'lil-gui'

/**
 * The vassals' reveal by zoom. Every field is read on each frame, so none needs a callback.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
export function addVassalFolder(gui: GUI, deps: DevPanelDeps): void {
  const folder = gui.addFolder('vassals (by zoom)')
  for (const key of VASSAL_CONTROL_ORDER)
    addControl(folder, deps.vassals, key, VASSAL_CONTROLS[key], noEffect)
  folder.close()
}
