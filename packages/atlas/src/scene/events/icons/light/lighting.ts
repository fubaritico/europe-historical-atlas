/**
 * The markers' lights: a rim against the light, a key on the reader's side, a low sky — turned with the camera at
 * every frame (`../../markerLights`), so the icons and the pins always read as volumes, whatever the point of view.
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
  /**
   * The counter-light, cool against the warm rim, on the faces the key leaves dark — for a building, whose walls
   * turned the same way all take one tone (the dev, 2026-11-17, of the cathedral: « il faudrait des contre-éclairages »,
   * then « quand c'est un bâtiment, pour faire ressortir son volume, on sera obligé d'avoir recours à ce genre
   * d'artifice »). **Not for the other icons** (« c'est pas la peine »): left out or `0`, none — the map's own lighting.
   * Tried at `1` on the cathedral.
   */
  counter?: number
  /**
   * Where the counter-light stands in the camera's frame (+Z toward the reader); left out, low on the left, opposite
   * the key. `[0, 1, 10]` is a light from the camera itself, the one kept for the cathedral (the dev, 2026-11-17: « un
   * contre-éclairage comme s'il venait de la caméra », then « on voit mieux »).
   */
  counterFrom?: [number, number, number]
}

/**
 * The default lighting: a strong rim, a softer key, a low sky — the contrast that makes a small object read as a
 * volume (the dev, 2026-10-26: the same problem as the relief's).
 */
export const ICON_LIGHTING: IconLighting = { rim: 5, key: 1.3, sky: 0.35, counter: 0 }

/**
 * The lighting of a map on which a building stands: the default, and the counter-light from the camera itself, as set
 * on the cathedral at Cologne (the dev, 2026-11-17: « un contre-éclairage comme s'il venait de la caméra », then « on
 * voit mieux »).
 */
export const BUILDING_LIGHTING: IconLighting = {
  ...ICON_LIGHTING,
  counter: 1,
  counterFrom: [0, 1, 10],
}

/** Where the rim light stands in the camera's frame (+Z toward the reader): behind the icon, above it, to the left. */
const RIM_FROM: [number, number, number] = [-6, 8, -10]

/** Where the key light stands in the camera's frame: on the reader's side, above, to the right. */
const KEY_FROM: [number, number, number] = [7, 5, 10]

/** Where the counter-light stands in the camera's frame: on the reader's side, low, to the left — opposite the key. */
const COUNTER_FROM: [number, number, number] = [-9, 2, 6]

/**
 * The icons' lights, set in the camera's frame: the rig is turned with the camera at each frame, so the rim is
 * always behind an icon and the key always on the reader's side, whatever the point of view — lit in the world, one
 * point of view would show the volume and the next would lose it. The relief is unlit
 * (`MeshBasicMaterial`), so these light the markers — the icons and the pins — and nothing else.
 * @param lighting - how bright each light is
 * @returns the rig — a group holding the rim, the key and the sky, in that order, then the counter-light when the
 *   lighting asks for one — to turn with the camera
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
  // The counter-light, when asked for: last, so the first three keep their places.
  if (lighting.counter !== undefined && lighting.counter > 0) {
    const counter = new DirectionalLight('#cfdcff', lighting.counter)
    counter.position.set(...(lighting.counterFrom ?? COUNTER_FROM))
    rig.add(counter)
  }
  return rig
}
