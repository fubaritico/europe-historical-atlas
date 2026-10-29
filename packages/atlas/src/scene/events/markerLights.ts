/**
 * The markers' lights, as a marker of their own: one rig for the pins and the icons alike, so every lit marker is lit
 * once, whichever kinds the map holds — the pin has a volume since 2026-10-27 (ATLAS-298), and lights held by the
 * icons alone would leave a map of pins in the dark.
 */

import { createIconLights } from './icons/light/lighting'

import type { IconLighting } from './icons/light/lighting'
import type { CameraPose, EventMarkers } from './markers'

/**
 * The lights of every marker, turned with the camera at each frame so the rim stays behind and the key on the
 * reader's side (`icons/light/lighting`).
 * @param lighting - how bright each light is; the icons' default when left out
 * @returns the lights, shaped like the markers' handle
 */
export function createMarkerLights(lighting?: IconLighting): EventMarkers {
  const object = createIconLights(lighting)
  // On every layer, so a blur drawing the icons alone on a layer of their own lights them too (ATLAS-302).
  object.traverse((light) => {
    light.layers.enableAll()
  })
  return {
    object,
    setReliefScale(): void {
      // The lights stand in the camera's frame, not on the ground.
    },
    setZoom(): void {
      // The lights light every zoom alike.
    },
    faceCamera(camera: CameraPose): void {
      // The rig is never under a turned group, so an orientation set here is the orientation in the world.
      object.quaternion.copy(camera.quaternion)
    },
    dispose(): void {
      // Lights hold no GPU resources.
    },
  }
}
