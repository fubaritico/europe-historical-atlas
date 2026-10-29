import { DirectionalLight, Euler, Light, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { BLUR_LAYERS } from '../blurLayers'

import { createMarkerLights } from './markerLights'

describe('createMarkerLights', () => {
  describe('happy path', () => {
    it('holds a directional light', () => {
      const lights: Light[] = []
      createMarkerLights().object.traverse((child) => {
        if (child instanceof Light) lights.push(child)
      })
      expect(lights.some((light) => light instanceof DirectionalLight)).toBe(true)
    })
  })

  describe('variants', () => {
    // ATLAS-302: the 3D icons' blur draws them on a layer of their own, which these lights must reach too.
    it('lights every layer, so a blur drawing the icons on their own layer lights them', () => {
      const lights = createMarkerLights().object.children
      expect(
        lights.every(
          (light) => light.layers.isEnabled(0) && light.layers.isEnabled(BLUR_LAYERS.icons)
        )
      ).toBe(true)
    })

    it('takes the brightness of each light from the lighting given', () => {
      const lights = createMarkerLights({ rim: 1, key: 2, sky: 3 }).object.children
      expect(lights.map((light) => (light as DirectionalLight).intensity)).toEqual([1, 2, 3])
    })
  })

  // L3: N/A — nothing to refuse: no input but a camera pose
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('turns the lights with the camera, so the rim stays behind the markers', () => {
      const lights = createMarkerLights()
      const quaternion = new Quaternion().setFromEuler(new Euler(-1, 0.5, 0))
      lights.faceCamera({ position: new Vector3(0, 5, 5), quaternion }, 0)
      expect(lights.object.quaternion.angleTo(quaternion)).toBeCloseTo(0)
    })

    it('stays where it is when the relief is exaggerated', () => {
      const lights = createMarkerLights()
      lights.setReliefScale(3)
      expect(lights.object.position.toArray()).toEqual([0, 0, 0])
    })
  })
})
