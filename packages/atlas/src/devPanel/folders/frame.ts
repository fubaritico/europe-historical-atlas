/**
 * The panel's frame controls.
 */

import { FRAME_CONTROLS, FRAME_CONTROL_ORDER } from '../../tunables/params'
import { addControl } from '../addControl'

import type { DevPanelDeps } from '../panelContract'
import type GUI from 'lil-gui'

/**
 * The sheet and its graduated border.
 *
 * Every tunable rebuilds both: the border's place is decided by the map's own edge and the sheet is
 * what it is drawn on, so there is no half of this that can change alone.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
export function addFrameFolder(gui: GUI, deps: DevPanelDeps): void {
  const folder = gui.addFolder('sheet + border')
  for (const key of FRAME_CONTROL_ORDER)
    addControl(folder, deps.frame, key, FRAME_CONTROLS[key], deps.callbacks.rebuildFrame)
  folder.close()
}
