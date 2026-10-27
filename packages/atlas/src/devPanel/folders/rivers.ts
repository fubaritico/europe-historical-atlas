/**
 * The panel's rivers controls.
 */

import { RIVER_CONTROLS, RIVER_CONTROL_ORDER } from '../../tunables/params'
import { addControl } from '../addControl'

import type { RiverDevParams } from '../../tunables/params'
import type { DevPanelDeps } from '../panelContract'
import type GUI from 'lil-gui'

/**
 * The river network.
 *
 * Everything but the colour is baked into the layer when it is built — the reveal thresholds and the
 * opacity are read from the options the layer captured, and a stroke width is fixed at material
 * construction. So every one of them needs a rebuild; only the colour has a live setter. This is the
 * hole a previous session's inert sliders went through.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
export function addRiverFolder(gui: GUI, deps: DevPanelDeps): void {
  const { river, callbacks } = deps
  const folder = gui.addFolder('rivers')
  // Colour is set live; every other field rebuilds the rivers.
  const effect = (key: keyof RiverDevParams): (() => void) =>
    key === 'color'
      ? (): void => {
          callbacks.setRiverColor(river.color)
        }
      : callbacks.rebuildRivers
  for (const key of RIVER_CONTROL_ORDER)
    addControl(folder, river, key, RIVER_CONTROLS[key], effect(key), key === 'color')
  folder.close()
}
