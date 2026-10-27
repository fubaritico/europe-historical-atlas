import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { cameraUp, facingCamera, iconSway } from './facing'
import { ICON_SWAY } from './settings'

// L3: N/A — pure arithmetic over numbers and vectors; nothing is refused
// L4: N/A — no async work, nothing external

/**
 * A camera standing somewhere, turned some way.
 * @param position - where it stands
 * @param turn - how it is turned
 * @returns its pose
 */
function pose(position: Vector3, turn: Euler) {
  return { position, quaternion: new Quaternion().setFromEuler(turn) }
}

describe('iconSway', () => {
  it('is still at the start', () => {
    expect(iconSway(0, 0)).toBeCloseTo(0)
  })

  it('reaches its full swing a quarter of a period in', () => {
    expect(iconSway(ICON_SWAY.periodSeconds / 4, 0)).toBeCloseTo(ICON_SWAY.amplitudeRad)
  })

  it('never swings past its swing', () => {
    for (let second = 0; second < 8; second += 0.1) {
      expect(Math.abs(iconSway(second, 3))).toBeLessThanOrEqual(ICON_SWAY.amplitudeRad + 1e-9)
    }
  })

  it('sways two icons out of step', () => {
    expect(iconSway(1, 1)).not.toBeCloseTo(iconSway(1, 0))
  })
})

/**
 * Face an icon to a camera, the way a frame does.
 * @param at - where the icon stands
 * @param camera - the camera
 * @returns the icon's orientation
 */
function face(at: Vector3, camera: ReturnType<typeof pose>): Quaternion {
  const up = cameraUp(camera, new Vector3())
  return facingCamera(at, camera.position, up, new Quaternion(), new Matrix4())
}

describe('facingCamera', () => {
  it('faces a camera due south, level, with no turn', () => {
    const at = new Vector3(0, 0, 0)
    const turned = face(at, pose(new Vector3(0, 0, 5), new Euler()))
    expect(turned.angleTo(new Quaternion())).toBeCloseTo(0)
  })

  it('leans back toward a camera above it, keeping its top toward the camera’s up', () => {
    const at = new Vector3(0, 0, 0)
    const above = pose(new Vector3(0, 5, 2), new Euler(-1.19, 0, 0))
    const turned = face(at, above)
    const front = new Vector3(0, 0, 1).applyQuaternion(turned)
    expect(front.y).toBeGreaterThan(0.9)
    expect(new Vector3(0, 1, 0).applyQuaternion(turned).z).toBeLessThan(0)
  })

  it('faces the camera’s position, not its orientation, when off the middle of the view', () => {
    const at = new Vector3(3, 0, 0)
    const camera = pose(new Vector3(0, 0, 5), new Euler())
    const front = new Vector3(0, 0, 1).applyQuaternion(face(at, camera))
    expect(front.x).toBeLessThan(-0.4)
  })
})
