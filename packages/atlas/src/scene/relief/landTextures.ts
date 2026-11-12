/**
 * The land mask on the GPU, for the layers that tint the relief to stop on the coast (CORE-421: a polity's outline may
 * run over the sea; its colour, its tribes' and its hatches' stop where the mask's land does). Two textures side by
 * side, west and east: the mask is 5 120 cells wide, past the 4 096 a GPU may refuse — split, it keeps its full
 * fineness on every machine (the dev's choice, 2026-11-12, over halving it).
 */

import { DataTexture, LinearFilter, RedFormat, UnsignedByteType } from 'three'

import type { LandMask } from '@europe-historical-atlas/core/data/landMask'

/** The two halves of the land mask, and where the west one ends. */
export interface LandTextures {
  /** The western columns: one byte a cell, 255 over land. */
  west: DataTexture
  /** The eastern columns. */
  east: DataTexture
  /** Where the west half ends, as a fraction of the mask's width — the `u` a fragment switches halves at. */
  split: number
  /** Free both textures. */
  dispose: () => void
}

/**
 * One half of the mask as a texture, rows north first as the terrain's.
 * @param mask - the land mask
 * @param bits - its cells, packed (MSB first, row-major, 1 = land)
 * @param from - its first column
 * @param to - one past its last column
 * @returns the texture
 */
function half(mask: LandMask, bits: Uint8Array, from: number, to: number): DataTexture {
  const { width, height } = mask.meta
  const cols = to - from
  const bytes = new Uint8Array(cols * height)
  // Read from the packed cells, not through `isLand`: a cell is exactly what `isLand` answers at `col/(width-1)`,
  // and the 24 million calls would block the thread (review ARCH-002). Every index lies in the packed table, whose
  // length is the cells' count rounded up to a byte: the `?? 0` only satisfies the indexed-access check.
  for (let row = 0; row < height; row++) {
    for (let col = from; col < to; col++) {
      const index = row * width + col
      if (((bits[index >> 3] ?? 0) >> (7 - (index & 7))) & 1) bytes[row * cols + (col - from)] = 255
    }
  }
  const texture = new DataTexture(bytes, cols, height, RedFormat, UnsignedByteType)
  // Row 0 is the north, as the terrain's: the relief's `vUv.y` is 1 there.
  texture.flipY = true
  texture.unpackAlignment = 1
  // Linear, so the threshold at one half draws the coast between the cells, not along their edges.
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

/**
 * The land mask as two GPU textures.
 * @param mask - the land mask, or its declared fallback when the asset failed
 * @returns the two halves and their split
 */
export function createLandTextures(mask: LandMask): LandTextures {
  const { width } = mask.meta
  const middle = Math.ceil(width / 2)
  const bits = mask.pack()
  const west = half(mask, bits, 0, middle)
  const east = half(mask, bits, middle, width)
  return {
    west,
    east,
    split: middle / width,
    dispose(): void {
      west.dispose()
      east.dispose()
    },
  }
}
