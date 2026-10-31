/**
 * Which cities' names are near enough to read (ATLAS-295, the dev, 2026-10-31): close up, the cities at the back of a
 * tilted view shrink with the perspective and their names become unreadable — Philippopolis, Smyrne, even
 * Constantinople. **What makes a name unreadable is its distance to the camera**, so a name shows only while its city is
 * no further from the camera than a share of the camera's distance to the point it looks at — the centre of the screen.
 * On screen that is nearly a level line: below it every name, above it none (the dev: *« plus ça va vers le haut […]
 * moins on en voit »*); seen from straight above, every city is about as far, and every name shows. It replaced a circle
 * around the centre, which cut the cities at the bottom of the screen — the nearest, and the most legible. The share is
 * the level of detail's (`detail/detailLevels`, `nameReach`), tightening as the zoom closes in. A name **enters and
 * leaves in a fade in time**, never progressively; a little further out to leave than to enter, so a city resting on the
 * line never flickers while the map slides.
 */

import { Vector3 } from 'three'

import type { CameraPose } from '../events/markers'

/** How much further out a name leaves than it enters, as a share of the reach. */
export const NAME_REACH_HYSTERESIS = 0.1

/** Where the camera looks on the ground, and how far it is from it. */
export interface LookedAt {
  /** The point on the ground plane the camera's axis meets. */
  readonly x: number
  /** The point on the ground plane the camera's axis meets. */
  readonly z: number
  /** The camera's distance to it, in world units. */
  readonly distance: number
}

/** The camera's axis, worked in at every frame. */
const axis = new Vector3()

/**
 * The point the camera looks at: where its axis meets the ground plane (`y = 0`).
 * @param camera - where the camera stands and how it is turned
 * @returns the point and the distance to it, or `null` when the camera looks level or up and meets no ground
 */
export function lookedAt(camera: CameraPose): LookedAt | null {
  axis.set(0, 0, -1).applyQuaternion(camera.quaternion)
  if (axis.y >= 0) return null
  const distance = -camera.position.y / axis.y
  return {
    x: camera.position.x + axis.x * distance,
    z: camera.position.z + axis.z * distance,
    distance,
  }
}

/**
 * Whether a city's name is near enough to the camera to read, given whether it was.
 * @param city - the city's point, in the world
 * @param camera - where the camera stands
 * @param looked - where the camera looks, and how far that is
 * @param share - the reach, as a share of the camera's distance to the point it looks at (the level of detail's)
 * @param wasIn - whether the name was within reach last frame
 * @returns whether it is now
 */
export function inNameReach(
  city: Vector3,
  camera: Vector3,
  looked: LookedAt,
  share: number,
  wasIn: boolean
): boolean {
  const reach = looked.distance * share * (wasIn ? 1 + NAME_REACH_HYSTERESIS : 1)
  return city.distanceTo(camera) <= reach
}
