// @vitest-environment jsdom
import { LinearMipmapLinearFilter, RepeatWrapping } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { HATCH_TEXELS_PER_STRIPE, createHatchTextures, stripeTexels } from './hatchTextures'

// ATLAS-399: the stripe images, baked once and repeated on the ground — one channel per colour, mipmapped.

/**
 * Which channel a texel lights.
 * @param texels - four bytes a texel
 * @param x - the texel
 * @returns the channel at 255, `-1` when none is
 */
function litChannel(texels: Uint8Array, x: number): number {
  return [0, 1, 2, 3].find((channel) => texels[4 * x + channel] === 255) ?? -1
}

describe('stripeTexels', () => {
  describe('happy path', () => {
    it('lights red on the first stripe and green on the second, for two colours', () => {
      const texels = stripeTexels(2)
      expect([litChannel(texels, 0), litChannel(texels, HATCH_TEXELS_PER_STRIPE)]).toEqual([0, 1])
    })
  })

  describe('variants', () => {
    it('lights the four channels in turn for four colours, one stripe each', () => {
      const texels = stripeTexels(4)
      const lit = [0, 1, 2, 3].map((stripe) => litChannel(texels, stripe * HATCH_TEXELS_PER_STRIPE))
      expect(lit).toEqual([0, 1, 2, 3])
    })
  })

  // L3, L4: N/A — a count from 2 to 4, written by the layer itself.

  describe('edge cases', () => {
    it('lights exactly one channel on every texel, at the last texel of a stripe too', () => {
      const texels = stripeTexels(3)
      const last = HATCH_TEXELS_PER_STRIPE - 1
      const sums = [0, last, last + 1].map(
        (x) =>
          (texels[4 * x] ?? 0) +
          (texels[4 * x + 1] ?? 0) +
          (texels[4 * x + 2] ?? 0) +
          (texels[4 * x + 3] ?? 0)
      )
      expect([sums, litChannel(texels, last), litChannel(texels, last + 1)]).toEqual([
        [255, 255, 255],
        0,
        1,
      ])
    })
  })
})

describe('createHatchTextures', () => {
  describe('happy path', () => {
    it('makes three images that repeat along their row and are read through mipmaps', () => {
      const textures = createHatchTextures()
      const all = [textures.two, textures.three, textures.four]
      expect(
        all.map((texture) => [texture.wrapS, texture.minFilter, texture.generateMipmaps])
      ).toEqual(all.map(() => [RepeatWrapping, LinearMipmapLinearFilter, true]))
      textures.dispose()
    })
  })

  describe('variants', () => {
    it('gives each image as many stripes as it has colours', () => {
      const { two, three, four, dispose } = createHatchTextures()
      expect([two, three, four].map((texture) => texture.image.width)).toEqual(
        [2, 3, 4].map((count) => count * HATCH_TEXELS_PER_STRIPE)
      )
      dispose()
    })
  })

  // L3, L4: N/A — nothing is read from outside.

  describe('edge cases', () => {
    it('frees all three images', () => {
      const textures = createHatchTextures()
      const spies = [textures.two, textures.three, textures.four].map((texture) =>
        vi.spyOn(texture, 'dispose')
      )
      textures.dispose()
      expect(spies.map((spy) => spy.mock.calls.length)).toEqual([1, 1, 1])
    })
  })
})
