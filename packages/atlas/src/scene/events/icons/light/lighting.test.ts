import { describe, expect, it } from 'vitest'

import { createIconLights } from './lighting'

import type { DirectionalLight } from 'three'

describe('createIconLights', () => {
  it('puts the rim behind the icon and the key on the reader’s side, in the camera’s frame', () => {
    const [rim, key] = createIconLights().children
    expect(rim?.position.z).toBeLessThan(0)
    expect(key?.position.z).toBeGreaterThan(0)
  })

  it('makes the rim the strongest light, as against the light wants', () => {
    const [rim, key, sky] = createIconLights().children as DirectionalLight[]
    expect(rim?.intensity).toBeGreaterThan(key?.intensity ?? Infinity)
    expect(rim?.intensity).toBeGreaterThan(sky?.intensity ?? Infinity)
  })

  it('takes the brightness of each light from the lighting given', () => {
    const lights = createIconLights({ rim: 1, key: 2, sky: 3 }).children
    expect(lights.map((light) => (light as DirectionalLight).intensity)).toEqual([1, 2, 3])
  })

  describe('the counter-light, for a building', () => {
    // The dev, 2026-11-17, of the cathedral: « il faudrait des contre-éclairages ».
    it('adds none when the lighting asks for none, left out or at zero', () => {
      expect(createIconLights({ rim: 1, key: 2, sky: 3 }).children).toHaveLength(3)
      expect(createIconLights({ rim: 1, key: 2, sky: 3, counter: 0 }).children).toHaveLength(3)
    })

    it('adds it last, at its brightness, low on the reader’s side and opposite the key', () => {
      const [, key, , counter] = createIconLights({ rim: 1, key: 2, sky: 3, counter: 0.8 })
        .children as DirectionalLight[]

      expect(counter?.intensity).toBe(0.8)
      expect(counter?.position.z).toBeGreaterThan(0)
      // The key stands to the right, the counter-light to the left.
      expect(Math.sign(counter?.position.x ?? 0)).toBe(-Math.sign(key?.position.x ?? 0))
    })

    it('stands it where the lighting says: on the camera itself', () => {
      const counter = createIconLights({
        rim: 1,
        key: 2,
        sky: 3,
        counter: 1,
        counterFrom: [0, 1, 10],
      }).children[3]

      expect(counter?.position.toArray()).toEqual([0, 1, 10])
    })
  })
})
