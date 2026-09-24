import { DataTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import { describe, expect, it } from 'vitest'

import { wrapTerrainTexture } from './terrainTexture'

/** An opaque RGBA buffer of the given size. */
function pixels(width: number, height: number): Uint8Array {
  return new Uint8Array(width * height * 4).fill(200)
}

describe('wrapTerrainTexture', () => {
  describe('happy path', () => {
    it('builds an sRGB DataTexture with flipY set and matching dimensions', () => {
      const texture = wrapTerrainTexture(pixels(3, 2), 3, 2)
      expect(texture).toBeInstanceOf(DataTexture)
      expect(texture.flipY).toBe(true)
      expect(texture.colorSpace).toBe(SRGBColorSpace)
      expect(texture.image.width).toBe(3)
      expect(texture.image.height).toBe(2)
    })

    it('wraps the buffer rather than copying it — the bytes were transferred in', () => {
      const rgba = pixels(2, 2)
      expect(wrapTerrainTexture(rgba, 2, 2).image.data).toBe(rgba)
    })

    it('schedules the upload and asks for mipmaps', () => {
      const texture = wrapTerrainTexture(pixels(2, 2), 2, 2)
      expect(texture.magFilter).toBe(LinearFilter)
      expect(texture.minFilter).toBe(LinearMipmapLinearFilter)
      expect(texture.generateMipmaps).toBe(true)
      // `needsUpdate` is a write-only accessor (three's Texture.js): reading it yields undefined, and
      // the upload it schedules is observable through the version counter instead.
      expect(texture.version).toBeGreaterThan(0)
    })
  })

  describe('variants', () => {
    it('takes whatever size the bake produced, supersampled or not', () => {
      const texture = wrapTerrainTexture(pixels(6, 4), 6, 4)
      expect(texture.image.width).toBe(6)
      expect(texture.image.height).toBe(4)
      expect(texture.image.data?.length).toBe(6 * 4 * 4)
    })
  })

  // L3: N/A — the wrapper has no branch to take. Its input is a buffer the compositor sized, and
  // `composeTerrainRgba` (tested in pipeline/) is what validates the elevation source.
  // L4: N/A — nothing async, nothing thrown. A buffer whose length disagrees with the dimensions is a
  // programming error inside three.js that no fallback here could make safe.

  describe('edge cases', () => {
    it('handles a single pixel', () => {
      const texture = wrapTerrainTexture(pixels(1, 1), 1, 1)
      expect(texture.image.width).toBe(1)
      expect(texture.image.data?.length).toBe(4)
    })

    it('frees its GPU handle on dispose without touching the buffer', () => {
      const rgba = pixels(1, 1)
      const texture = wrapTerrainTexture(rgba, 1, 1)
      expect(() => {
        texture.dispose()
      }).not.toThrow()
      expect(rgba[0]).toBe(200)
    })
  })
})
