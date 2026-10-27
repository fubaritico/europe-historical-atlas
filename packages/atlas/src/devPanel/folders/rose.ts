/**
 * The panel's rose controls.
 */

import { ROSE_CONTROLS, ROSE_CONTROL_ORDER } from '../../tunables/params'
import { addControl } from '../addControl'

import type { RoseDevParams } from '../../tunables/params'
import type { DevPanelDeps } from '../panelContract'
import type GUI from 'lil-gui'

/**
 * The compass rose. Colours, labels and size are baked into its SVG, so each change regenerates it;
 * opacity is the exception, being a live material tweak.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
export function addRoseFolder(gui: GUI, deps: DevPanelDeps): void {
  const { rose, callbacks } = deps
  const folder = gui.addFolder('compass rose')
  // Opacity is set live; every other field regenerates the rose.
  const effect = (key: keyof RoseDevParams): (() => void) =>
    key === 'opacity'
      ? (): void => {
          callbacks.setRoseOpacity(rose.opacity)
        }
      : callbacks.rebuildRose
  for (const key of ROSE_CONTROL_ORDER)
    addControl(
      folder,
      rose,
      key,
      ROSE_CONTROLS[key],
      effect(key),
      key === 'opacity' || key === 'showLabels'
    )
  folder.close()
}
