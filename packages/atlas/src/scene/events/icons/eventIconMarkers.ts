/**
 * The event icons on the map (ATLAS-156): each event's icon stood on its place, and kept right at every frame — its
 * form for the zoom, turned to the camera, following the relief's exaggeration. The pieces live beside it: the values
 * tuned on sight (`settings`), the turning (`facing`), the zoom (`crossFade`), the forms on the relief (`forms`), the
 * models (`meshes/`), the drawing from afar (`flat/`), the lights and the halo (`light/`).
 */

import { Matrix4, Quaternion, Vector3 } from 'three'

import { flatIconSize, iconCrossFade } from './crossFade'
import { UPRIGHT, cameraUp, facingCamera, iconSway } from './facing'
import { iconGroups, iconSprites, placeIcon, standForms } from './forms'
import { EVENT_ICON_HEIGHT } from './settings'

import type { LoadSvgTexture, PlacedEventIcon } from './forms'
import type { CameraPose, EventMarkers } from '../markers'

/**
 * Stand one icon on each place, in two forms the zoom chooses between (`setZoom`): close up, the 3D icon, turned to
 * the camera and swayed (`faceCamera`) under its own lights, a light halo behind it to detach it from the map; from
 * afar, its flat drawing ringed with light, at a fixed size on screen. The lights are a child of the group, so they
 * come and go with the icons and light nothing else: the relief and the pins are unlit materials.
 * @param placed - each icon and where it stands
 * @param loadTexture - how a flat icon's SVG becomes a texture
 * @param height - how tall a 3D icon stands
 * @returns the icons, shaped like the pins' handle
 */
export function createEventIconMarkers(
  placed: readonly PlacedEventIcon[],
  loadTexture: LoadSvgTexture,
  height: number = EVENT_ICON_HEIGHT
): EventMarkers {
  // The groups and the shared sprite materials, then each icon's forms placed in them.
  const groups = iconGroups()
  const { object, lights } = groups
  const sprites = iconSprites(loadTexture)
  const icons = placed.map((at) => placeIcon(at, height, sprites, groups))

  // Worked in at every frame, never reallocated: the sway, the camera's up, the facing matrix.
  const sway = new Quaternion()
  const up = new Vector3()
  const look = new Matrix4()

  return {
    object,
    setReliefScale(scale: number): void {
      for (const forms of icons) standForms(forms, height, scale)
    },
    setZoom(zoom: number, pixelsPerUnit: number): void {
      // How far in the 3D icons are; the flat ones get the rest.
      const near3d = iconCrossFade(zoom)
      // A form fully faded out is not drawn at all.
      groups.near.visible = near3d > 0
      groups.far.visible = near3d < 1
      sprites.halo.opacity = near3d
      sprites.setFlatOpacity(1 - near3d)
      // The flat icons keep a legible size on screen, whatever the zoom.
      const size = flatIconSize(height, pixelsPerUnit)
      for (const { icon, flat } of icons) {
        icon.setOpacity(near3d)
        flat.scale.setScalar(size)
      }
    },
    faceCamera(camera: CameraPose, seconds: number): void {
      // The group holding the icons is never turned, so an orientation set here is the orientation in the world.
      lights.quaternion.copy(camera.quaternion)
      cameraUp(camera, up)
      // Each icon turned to face the camera, then swayed about its own upright.
      icons.forEach(({ icon }, index) => {
        sway.setFromAxisAngle(UPRIGHT, iconSway(seconds, index))
        const { position, quaternion } = icon.object
        facingCamera(position, camera.position, up, quaternion, look).multiply(sway)
      })
    },
    dispose(): void {
      for (const { icon } of icons) icon.dispose()
      sprites.dispose()
    },
  }
}
