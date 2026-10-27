/**
 * The panel's camera controls.
 */

import {
  CAMERA_CONTROLS,
  CAMERA_CONTROL_ORDER,
  EXTENT_CONTROLS,
  EXTENT_CONTROL_ORDER,
} from '../../tunables/params'
import { addControl, noEffect } from '../addControl'

import type { DevPanelDeps } from '../panelContract'
import type GUI from 'lil-gui'

/**
 * The camera feel, and the extent its clamp works from.
 *
 * The controls read their options every frame, so none of these needs a callback — except the extent,
 * which the frustum clamp has to be told about.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
export function addCameraFolder(gui: GUI, deps: DevPanelDeps): void {
  const { controlsOptions, framing, extent, debug, callbacks } = deps
  const folder = gui.addFolder('camera')
  // The camera feel, written straight into the controls' live options, then the field of view.
  for (const key of CAMERA_CONTROL_ORDER)
    addControl(folder, controlsOptions, key, CAMERA_CONTROLS[key], noEffect)
  folder.add(framing, 'fov', 15, 60, 1).name('fov (lower = flatter)').onChange(callbacks.setFov)

  // The extent, re-applied to the clamp as each slider moves, and the switch for its overlays.
  const extentFolder = folder.addFolder('extent (view limit)')
  for (const key of EXTENT_CONTROL_ORDER)
    addControl(extentFolder, extent, key, EXTENT_CONTROLS[key], callbacks.applyExtent, true)
  extentFolder
    .add(debug, 'showFrustum')
    .name('show extent + footprint')
    .onChange(callbacks.setFrustumDebug)
  // A button that prints the camera's current state.
  folder.add({ logState: callbacks.logCameraState }, 'logState').name('log camera state')
  folder.close()
}
