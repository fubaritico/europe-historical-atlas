/**
 * The panel's relief controls.
 */

import { RELIEF_CONTROLS, RELIEF_CONTROL_ORDER } from '../../tunables/params'
import { addControl, noEffect } from '../addControl'

import type { ReliefDevParams } from '../../tunables/params'
import type { DevPanelDeps } from '../panelContract'
import type GUI from 'lil-gui'

/**
 * Relief, at the top level rather than in a folder: it is what the reader is looking at.
 *
 * Exaggeration is applied every frame in the loop (a cheap `scale.y`, no geometry); the height-curve
 * knobs need a geometry rebuild; the wireframe flips the live material.
 * @param gui - where to add the controls
 * @param deps - what the panel binds to
 * @returns nothing
 */
export function addReliefControls(gui: GUI, deps: DevPanelDeps): void {
  const { relief, callbacks } = deps
  // Wireframe flips the material, exaggeration is read per frame, the rest rebuild the relief.
  const effect = (key: keyof ReliefDevParams): (() => void) =>
    key === 'wireframe'
      ? (): void => {
          callbacks.setWireframe(relief.wireframe)
        }
      : key === 'exaggeration' || key === 'exaggZoomIn'
        ? noEffect
        : callbacks.rebuildRelief
  for (const key of RELIEF_CONTROL_ORDER)
    addControl(gui, relief, key, RELIEF_CONTROLS[key], effect(key), key === 'wireframe')
}
