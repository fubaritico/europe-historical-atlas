import { Euler, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { NAME_REACH_HYSTERESIS, inNameReach, lookedAt } from './nameReach'

import type { CameraPose } from '../events/markers'

/**
 * A camera above the origin's south, tilted down toward it.
 * @param pitchDeg - how far it looks down, in degrees
 * @returns its pose
 */
function camera(pitchDeg: number): CameraPose {
  const pitch = (pitchDeg * Math.PI) / 180
  return {
    position: new Vector3(0, Math.sin(pitch), Math.cos(pitch)),
    quaternion: new Quaternion().setFromEuler(new Euler(-pitch, 0, 0)),
  }
}

describe('lookedAt', () => {
  describe('happy path', () => {
    it('finds where the camera’s axis meets the ground, and how far it is', () => {
      const looked = lookedAt(camera(45))

      expect(looked?.x).toBeCloseTo(0)
      expect(looked?.z).toBeCloseTo(0)
      expect(looked?.distance).toBeCloseTo(1)
    })
  })

  describe('variants', () => {
    it('finds the same point from straight above', () => {
      expect(lookedAt(camera(90))?.z).toBeCloseTo(0)
    })
  })

  describe('managed errors', () => {
    it('meets no ground when the camera looks level', () => {
      expect(lookedAt(camera(0))).toBeNull()
    })
  })

  // L4: N/A — pure arithmetic.

  describe('edge cases', () => {
    it('meets no ground when the camera looks up', () => {
      expect(lookedAt(camera(-10))).toBeNull()
    })
  })
})

describe('inNameReach', () => {
  /** A camera one unit up, looking at the origin: one unit away. */
  const eye = new Vector3(0, 1, 0)
  const looked = { x: 0, z: 0, distance: 1 }
  /** A reach of 1.3 times the camera's distance to the point it looks at. */
  const SHARE = 1.3

  it('keeps a name while its city is no further from the camera than the share of the distance', () => {
    // 1.2 from the camera, then 1.4.
    expect(inNameReach(new Vector3(Math.sqrt(1.44 - 1), 0, 0), eye, looked, SHARE, false)).toBe(
      true
    )
    expect(inNameReach(new Vector3(Math.sqrt(1.96 - 1), 0, 0), eye, looked, SHARE, false)).toBe(
      false
    )
  })

  it('keeps a city under the camera however far it is from the centre of the screen on the ground', () => {
    // The circle around the centre cut these: nearer the camera than the centre itself.
    const camera = new Vector3(0, 1, 3)
    expect(
      inNameReach(
        new Vector3(0, 0, 2.5),
        camera,
        { x: 0, z: 0, distance: Math.hypot(1, 3) },
        SHARE,
        false
      )
    ).toBe(true)
  })

  it('lets a name already in leave only a little further out', () => {
    const edge = SHARE * (1 + NAME_REACH_HYSTERESIS / 2)
    const city = new Vector3(Math.sqrt(edge * edge - 1), 0, 0)
    expect(inNameReach(city, eye, looked, SHARE, true)).toBe(true)
    expect(inNameReach(city, eye, looked, SHARE, false)).toBe(false)
  })
})
