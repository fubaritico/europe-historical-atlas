/**
 * The dev panel: a lil-gui tool over the settings, one folder per system (`folders/`), each control wired to
 * what it rebuilds on the map. A keeper — toggleable and extensible; grow it in `folders/`, not here.
 */

import GUI from 'lil-gui'

import { addCameraFolder } from './folders/camera'
import { addCoastlineFolder } from './folders/coastline'
import { addFrameFolder } from './folders/frame'
import { addNameFolder } from './folders/names'
import { addPoliticalFolder } from './folders/political'
import { addReliefControls } from './folders/relief'
import { addRhumbFolder } from './folders/rhumbs'
import { addRiverFolder } from './folders/rivers'
import { addRoseFolder } from './folders/rose'
import { addTextureFolder } from './folders/texture'
import { addTribeFolder } from './folders/tribes'
import { addVassalFolder } from './folders/vassals'
import { createResetAction, snapshotDefaults } from './reset'

import type { DevPanelDeps } from './panelContract'

/**
 * Build the lil-gui dev panel, wiring each control to its param object and side-effect callback.
 *
 * The panel is a keeper: a toggleable, extensible debug tool. Grow it here — one function per folder —
 * not inline in the composition root.
 * @param deps - the param objects + side-effect callbacks
 * @returns the `GUI` instance (caller calls `gui.destroy()` on teardown)
 */
export function createDevPanel(deps: DevPanelDeps): GUI {
  const gui = new GUI({ title: 'europe-map · dev' })
  // Snapshot the defaults before any control can change a value, so reset has them.
  const defaults = snapshotDefaults(deps)

  // Dump every tunable value at once so a tuned look can be pasted back as defaults.
  gui.add({ logAll: deps.callbacks.logAll }, 'logAll').name('⤓ log ALL settings')
  gui
    .add({ resetToDefaults: createResetAction(gui, deps, defaults) }, 'resetToDefaults')
    .name('↺ reset to defaults')

  // The controls, one function per system, top to bottom as they appear in the panel.
  addReliefControls(gui, deps)
  addTextureFolder(gui, deps)
  addCoastlineFolder(gui, deps)
  addRhumbFolder(gui, deps)
  addRiverFolder(gui, deps)
  addPoliticalFolder(gui, deps)
  addVassalFolder(gui, deps)
  addNameFolder(gui, deps)
  addTribeFolder(gui, deps)
  addRoseFolder(gui, deps)
  addFrameFolder(gui, deps)
  addCameraFolder(gui, deps)
  return gui
}
