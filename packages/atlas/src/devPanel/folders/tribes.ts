/**
 * The panel's tribes controls.
 */

import { TRIBE_CONTROLS, TRIBE_CONTROL_ORDER } from '../../tunables/params'
import { addControl, noEffect } from '../addControl'

import type { DevPanelDeps } from '../panelContract'
import type GUI from 'lil-gui'

/**
 * The tribes' vanishing edge — inset or outset, and its width. Every field is read on each frame and
 * written to a uniform, so none needs a callback.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
export function addTribeFolder(gui: GUI, deps: DevPanelDeps): void {
  const folder = gui.addFolder('tribes (vanishing edge)')
  for (const key of TRIBE_CONTROL_ORDER)
    addControl(folder, deps.tribes, key, TRIBE_CONTROLS[key], noEffect)
  folder.close()
}
