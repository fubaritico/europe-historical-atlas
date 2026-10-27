/**
 * The panel's coastline controls.
 */

import { COASTLINE_CONTROLS, COASTLINE_CONTROL_ORDER } from '../../tunables/params'
import { addControl, noEffect } from '../addControl'

import type { CoastlineDevParams } from '../../tunables/params'
import type { DevPanelDeps } from '../panelContract'
import type GUI from 'lil-gui'

/**
 * The drawn shoreline. Colour is a live material tweak; jitter and strokes rebuild the geometry;
 * opacity is read every frame, so it needs no callback at all.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
export function addCoastlineFolder(gui: GUI, deps: DevPanelDeps): void {
  const { coast, callbacks } = deps
  const folder = gui.addFolder('coastline')
  // Colour is set live, opacity is read per frame, everything else rebuilds a layer.
  const effect = (key: keyof CoastlineDevParams): (() => void) =>
    key === 'color'
      ? (): void => {
          callbacks.setCoastColor(coast.color)
        }
      : key === 'opacity' || key === 'opacityZoomIn'
        ? noEffect
        : // The flat lift only places the rhumbs now: the coastline lies on the relief.
          key === 'yLift'
          ? callbacks.rebuildRhumb
          : callbacks.rebuildCoastline
  for (const key of COASTLINE_CONTROL_ORDER)
    addControl(folder, coast, key, COASTLINE_CONTROLS[key], effect(key), key === 'color')
  folder.close()
}
