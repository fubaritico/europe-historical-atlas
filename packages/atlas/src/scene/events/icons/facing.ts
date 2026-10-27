/**
 * How a 3D icon is turned at each frame: toward the camera, then swayed a little about its own upright, so the light
 * runs over its facets (the dev, 2026-10-26). Pure arithmetic, exercised with literals.
 */

import { Vector3 } from 'three'

import { ICON_SWAY } from './settings'

import type { CameraPose } from '../markers'
import type { Matrix4, Quaternion } from 'three'

/** The vertical axis an icon sways about, in its own frame; also the camera's up, in the camera's frame. */
export const UPRIGHT = new Vector3(0, 1, 0)

/**
 * How far an icon is swayed about its own upright at a moment: a slow swing either side of facing the camera, so the
 * light runs over its facets. Each icon is a little out of step with the one before, so a group does not move as one.
 * @param seconds - the time since the map started
 * @param index - the icon's rank, for its phase
 * @returns the sway, in radians, never past the swing
 */
export function iconSway(seconds: number, index: number): number {
  // Where in its swing the icon is: the time in periods, shifted a little by its rank.
  const phase = (2 * Math.PI * seconds) / ICON_SWAY.periodSeconds + index * 0.7
  return ICON_SWAY.amplitudeRad * Math.sin(phase)
}

/**
 * The camera's up, in the world — computed once a frame and shared by every icon (`facingCamera`).
 * @param camera - how the camera is turned
 * @param into - the vector to write
 * @returns `into`
 */
export function cameraUp(camera: CameraPose, into: Vector3): Vector3 {
  return into.copy(UPRIGHT).applyQuaternion(camera.quaternion)
}

/**
 * Turn an icon to face the camera's position — not its orientation: an icon away from the middle of the screen is
 * seen at an angle, and copying the camera's orientation left it facing past the reader, so its sway looked lopsided
 * (the dev, 2026-10-26). Its up stays the camera's up, so seen from above it leans back toward the reader. Writes
 * into what it is given, so a frame allocates nothing however many icons it turns.
 * @param at - where the icon stands, in the world
 * @param eye - where the camera stands
 * @param up - the camera's up, in the world (`cameraUp`)
 * @param into - the orientation to write
 * @param scratch - a matrix to work in
 * @returns `into`
 */
export function facingCamera(
  at: Vector3,
  eye: Vector3,
  up: Vector3,
  into: Quaternion,
  scratch: Matrix4
): Quaternion {
  return into.setFromRotationMatrix(scratch.lookAt(eye, at, up))
}
