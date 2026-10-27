/**
 * The 3D icons' own lights: a rim against the light, a key on the reader's side, a low sky — turned with the camera
 * at every frame (`eventIconMarkers`), so the icons always read as volumes, whatever the point of view.
 */

import { DirectionalLight, Group, HemisphereLight } from 'three'

/** How bright each of the icons' lights is. */
export interface IconLighting {
  /** The light behind the icon, against the light (the dev, 2026-10-26): it cuts out the edges. The strongest. */
  rim: number
  /** The light from the reader's side, on the faces the camera sees. Softer, so the faces keep their shading. */
  key: number
  /** The sky, so no face is black. Low, or it flattens the volume. */
  sky: number
}

/**
 * The default lighting: a strong rim, a softer key, a low sky — the contrast that makes a small object read as a
 * volume (the dev, 2026-10-26: the same problem as the relief's).
 */
export const ICON_LIGHTING: IconLighting = { rim: 5, key: 1.3, sky: 0.35 }

/** Where the rim light stands in the camera's frame (+Z toward the reader): behind the icon, above it, to the left. */
const RIM_FROM: [number, number, number] = [-6, 8, -10]

/** Where the key light stands in the camera's frame: on the reader's side, above, to the right. */
const KEY_FROM: [number, number, number] = [7, 5, 10]

/**
 * The icons' lights, set in the camera's frame: the rig is turned with the camera at each frame, so the rim is
 * always behind an icon and the key always on the reader's side, whatever the point of view — lit in the world, one
 * point of view would show the volume and the next would lose it. The relief and the pins are unlit
 * (`MeshBasicMaterial`), so these light the icons and nothing else.
 * @param lighting - how bright each light is
 * @returns the rig — a group holding the rim, the key and the sky, in that order — to turn with the camera
 */
export function createIconLights(lighting: IconLighting = ICON_LIGHTING): Group {
  // The rim: warm, behind the icons, so their edges light up against the map.
  const rim = new DirectionalLight('#fff4dd', lighting.rim)
  rim.position.set(...RIM_FROM)
  // The key: white, from the reader's side, on the faces the camera sees.
  const key = new DirectionalLight('#ffffff', lighting.key)
  key.position.set(...KEY_FROM)
  // The sky: light from above, earth-brown from below, so no face goes black.
  const sky = new HemisphereLight('#fff8e8', '#6b5a43', lighting.sky)
  // The three in one group, in that order, so the rig turns with the camera as one.
  const rig = new Group()
  rig.add(rim, key, sky)
  return rig
}
