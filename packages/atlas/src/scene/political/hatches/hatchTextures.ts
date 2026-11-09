/**
 * The hatches' stripe images (ATLAS-399): one per count of colours, two to four, each a single row repeated along the
 * map's diagonal. Stripe `k` of an image lights its channel `k` — red the first polity's, green the second's, blue
 * the third's, alpha the fourth's — so the shader reads, at any point, how much of each colour to lay.
 *
 * **Mipmapped**: from afar the GPU reads a reduced copy, where neighbouring stripes average into a mix of the colours
 * instead of flickering between them — the image is baked once, and the zoom never redraws it.
 */

import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
  UnsignedByteType,
} from 'three'

import { HATCH_MAX_COLOURS } from '@europe-historical-atlas/core/data/hatchStripes'

/**
 * Texels across one stripe — enough that the linear filter's soft step between two stripes stays a small fraction of
 * one close up.
 */
export const HATCH_TEXELS_PER_STRIPE = 64

/**
 * The texels of one stripe image: one row of `colours` stripes, stripe `k` lighting channel `k` alone.
 * @param colours - how many colours take turns, `2` to {@link HATCH_MAX_COLOURS}
 * @returns four bytes per texel
 */
export function stripeTexels(colours: number): Uint8Array {
  const width = colours * HATCH_TEXELS_PER_STRIPE
  const texels = new Uint8Array(width * 4)
  for (let x = 0; x < width; x++) texels[4 * x + Math.floor(x / HATCH_TEXELS_PER_STRIPE)] = 255
  return texels
}

/**
 * One stripe image, repeated along its row, mipmapped.
 * @param colours - how many colours take turns
 * @returns the texture
 */
function stripeTexture(colours: number): DataTexture {
  const texture = new DataTexture(
    stripeTexels(colours),
    colours * HATCH_TEXELS_PER_STRIPE,
    1,
    RGBAFormat,
    UnsignedByteType
  )
  texture.wrapS = RepeatWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  // A DataTexture makes no mipmaps unless asked (three's `DataTexture`).
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

/** The three stripe images, by count of colours. */
export interface HatchTextures {
  /** Two colours in turn. */
  readonly two: DataTexture
  /** Three. */
  readonly three: DataTexture
  /** Four. */
  readonly four: DataTexture
  /**
   * Free the three images.
   * @returns nothing
   */
  dispose: () => void
}

/**
 * The stripe images, for two, three and four colours.
 * @returns them, and how to free them
 */
export function createHatchTextures(): HatchTextures {
  const [two, three, four] = [2, 3, HATCH_MAX_COLOURS].map(stripeTexture)
  if (two === undefined || three === undefined || four === undefined)
    throw new Error('hatch layer: the stripe images were not made')
  return {
    two,
    three,
    four,
    dispose(): void {
      two.dispose()
      three.dispose()
      four.dispose()
    },
  }
}
