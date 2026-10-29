import { describe, expect, it } from 'vitest'

import { BLUR_LAYERS } from './blurLayers'

describe('BLUR_LAYERS', () => {
  it('gives each blur a layer of its own, none the camera’s, all among three’s 32', () => {
    const layers = Object.values(BLUR_LAYERS)
    expect(new Set(layers).size).toBe(layers.length)
    expect(layers.every((layer) => layer > 0 && layer < 32)).toBe(true)
  })
})
