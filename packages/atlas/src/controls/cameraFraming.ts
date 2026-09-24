/**
 * Where the camera sits, and how far the map may be panned before the view leaves it.
 *
 * Bounding the frustum's **ground footprint** rather than the target is what makes the pannable area
 * grow as you zoom in and re-centre as you pull out — and what makes it follow a window resize without
 * anyone having to recompute it.
 */

import { Vector3 } from 'three'

import { clamp } from '@europe-atlas/core/utils/math'

import { degToRad, distanceForZoom, pitchForZoom } from './controlsState'

import type { ControlsState } from './controlsState'

/** Up, in world space. Yaw is locked north, so this never changes. */
const WORLD_UP = new Vector3(0, 1, 0)

/**
 * Ground footprint of the frustum at a given zoom, as an AABB **offset from the target**.
 *
 * Yaw is locked, so the shape is translation-invariant in XZ and can be computed once per zoom rather
 * than per position. The four frustum corners are raycast onto `y = 0` using the live fov and aspect,
 * which is what makes the pannable range follow a resize without anyone having to recompute it.
 * @param state - the controls' state
 * @param z - zoom in `[0, 1]`
 * @returns the offsets, or `null` when a corner overshoots the horizon and the footprint is unbounded
 */
export function footprintOffsets(
  state: ControlsState,
  z: number
): { dxMin: number; dxMax: number; dzMin: number; dzMax: number } | null {
  const { camera, scratch } = state
  const distance = distanceForZoom(state.opts, z)
  const pitch = pitchForZoom(state.opts, z)
  const camY = distance * Math.sin(pitch)
  const camZ = distance * Math.cos(pitch) // camera sits at (0, camY, camZ) relative to the target
  scratch.f.set(0, -camY, -camZ).normalize() // forward: from camera toward the target (origin)
  scratch.r.crossVectors(scratch.f, WORLD_UP).normalize() // right (east)
  scratch.u.crossVectors(scratch.r, scratch.f).normalize() // camera up
  const halfH = Math.tan(degToRad(camera.fov) / 2)
  const halfW = halfH * camera.aspect
  let dxMin = Infinity
  let dxMax = -Infinity
  let dzMin = Infinity
  let dzMax = -Infinity
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      scratch.dir
        .copy(scratch.f)
        .addScaledVector(scratch.r, sx * halfW)
        .addScaledVector(scratch.u, sy * halfH)
        .normalize()
      if (scratch.dir.y > -1e-3) return null // the ray misses the ground → the footprint is unbounded
      const t = -camY / scratch.dir.y
      const hx = t * scratch.dir.x // camera x is 0 relative to the target
      const hz = camZ + t * scratch.dir.z
      dxMin = Math.min(dxMin, hx)
      dxMax = Math.max(dxMax, hx)
      dzMin = Math.min(dzMin, hz)
      dzMax = Math.max(dzMax, hz)
    }
  }
  return { dxMin, dxMax, dzMin, dzMax }
}

/**
 * Clamp the target so the frustum footprint stays within the extent.
 *
 * Bounding the *footprint* rather than the target is what makes the pannable area grow as you zoom in
 * and re-centre as you pull out. Where the footprint is wider than the extent on an axis, or unbounded,
 * the target locks to the extent's centre — there is no position that satisfies the constraint.
 * @param state - the controls' state
 * @returns nothing
 */
export function clampTarget(state: ControlsState): void {
  const ext = state.opts.extent
  const cx = (ext.minX + ext.maxX) / 2
  const cz = (ext.minZ + ext.maxZ) / 2
  const fp = footprintOffsets(state, state.zoom)
  let minX = cx
  let maxX = cx
  let minZ = cz
  let maxZ = cz
  if (fp) {
    minX = ext.minX - fp.dxMin
    maxX = ext.maxX - fp.dxMax
    minZ = ext.minZ - fp.dzMin
    maxZ = ext.maxZ - fp.dzMax
    if (minX > maxX) minX = maxX = cx
    if (minZ > maxZ) minZ = maxZ = cz
  }
  state.target.x = clamp(state.target.x, minX, maxX)
  state.target.z = clamp(state.target.z, minZ, maxZ)
  state.target.y = 0
}

/**
 * Put the camera where the current target and zoom say it belongs.
 *
 * Yaw locked north (north faces −Z): the camera sits south of and above the target, looking north-down.
 * @param state - the controls' state
 * @returns nothing
 */
export function placeCamera(state: ControlsState): void {
  const distance = distanceForZoom(state.opts, state.zoom)
  const pitch = pitchForZoom(state.opts, state.zoom)
  state.camera.position.set(
    state.target.x,
    state.target.y + distance * Math.sin(pitch),
    state.target.z + distance * Math.cos(pitch)
  )
  state.camera.lookAt(state.target)
}
