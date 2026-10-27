/**
 * The panel's texture controls.
 */

import {
  TERRAIN_CONTROLS,
  TERRAIN_CONTROL_GROUPS,
} from '@europe-historical-atlas/core/pipeline/terrainCompose'

import { addControl } from '../addControl'

import type { DevPanelDeps } from '../panelContract'
import type GUI from 'lil-gui'

/**
 * The terrain look, in sub-folders mirroring the compositing order.
 *
 * Regenerating the texture is a full pixel pass, so tuning fires on release. The shoreline is shared:
 * the coastline and the sea-clipped rhumbs sit on the same iso-line, so moving it rebuilds them too —
 * the coastline through the relief it lies on, whose shore ramp reads the same line when the land mask
 * failed (the grid is derived once per set of inputs, and the threshold is not one of them otherwise).
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
export function addTextureFolder(gui: GUI, deps: DevPanelDeps): void {
  const { texture, callbacks } = deps
  const folder = gui.addFolder('texture (parchment)')
  // The shoreline is shared, so sea level rebuilds the texture, the rhumbs and the relief.
  const onSeaLevelChange = (): void => {
    callbacks.rebuildTexture()
    callbacks.rebuildRhumb()
    callbacks.rebuildRelief() // retraces the coastline too, which lies on the relief
  }
  // One sub-folder per group, every other control rebaking the texture.
  for (const group of TERRAIN_CONTROL_GROUPS) {
    const sub = folder.addFolder(group.title)
    for (const key of group.keys) {
      const onChange = key === 'seaLevel' ? onSeaLevelChange : callbacks.rebuildTexture
      addControl(sub, texture, key, TERRAIN_CONTROLS[key], onChange)
    }
    sub.close()
  }
  folder.close()
}
