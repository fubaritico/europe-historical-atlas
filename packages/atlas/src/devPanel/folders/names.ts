/**
 * The panel's country-names controls.
 */

import { NAME_CONTROLS, NAME_CONTROL_ORDER, NAME_SCREEN_ORDER } from '../../tunables/params'
import { addControl, noEffect } from '../addControl'

import type { DevPanelDeps } from '../panelContract'
import type GUI from 'lil-gui'

/**
 * How the countries' names are written, their place chosen and how they show. A change to the writing or the placement
 * places the year's names again; one to how they show on screen is read by the next frame.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
export function addNameFolder(gui: GUI, deps: DevPanelDeps): void {
  const folder = gui.addFolder('country names')
  for (const key of NAME_CONTROL_ORDER)
    addControl(folder, deps.names, key, NAME_CONTROLS[key], deps.callbacks.rebuildNames)
  for (const key of NAME_SCREEN_ORDER)
    addControl(folder, deps.names, key, NAME_CONTROLS[key], noEffect, true)
  folder.close()
}
