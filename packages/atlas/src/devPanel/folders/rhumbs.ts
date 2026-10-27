/**
 * The panel's rhumbs controls.
 */

import { RHUMB_CONTROLS, RHUMB_CONTROL_ORDER } from '../../tunables/params'
import { addControl, noEffect } from '../addControl'

import type { RhumbDevParams } from '../../tunables/params'
import type { DevPanelDeps } from '../panelContract'
import type GUI from 'lil-gui'

/**
 * The portolan rhumb web. Centre and layout regenerate it; colour is live; opacity fades in the loop.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
export function addRhumbFolder(gui: GUI, deps: DevPanelDeps): void {
  const { rhumb, callbacks } = deps
  const folder = gui.addFolder('decor (rhumbs)')
  // Colour is set live, opacity is read per frame, everything else regenerates the web.
  const effect = (key: keyof RhumbDevParams): (() => void) =>
    key === 'color'
      ? (): void => {
          callbacks.setRhumbColor(rhumb.color)
        }
      : key === 'opacity' || key === 'opacityZoomIn'
        ? noEffect
        : callbacks.rebuildRhumb
  for (const key of RHUMB_CONTROL_ORDER)
    addControl(folder, rhumb, key, RHUMB_CONTROLS[key], effect(key), key === 'color')
  folder.close()
}
