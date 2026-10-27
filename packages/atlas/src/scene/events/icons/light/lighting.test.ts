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
})
