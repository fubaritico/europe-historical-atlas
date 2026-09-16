import { DataTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import { describe, expect, it } from 'vitest'

import { createHeightmap } from '../data/heightmap'
import { DEFAULT_TERRAIN_OPTIONS } from '../pipeline/terrainCompose'

import { createTerrainTexture, wrapTerrainTexture } from './terrainTexture'

import type { HeightmapMeta } from '../data/heightmap'
import type { TerrainTextureOptions } from '../pipeline/terrainCompose'

/** Build minimal metadata for a test grid. */
function meta(width: number, height: number, max: number): HeightmapMeta {
  return {
    width,
    height,
    zoom: 5,
    bbox: { west: 0, south: 0, east: 1, north: 1 },
    min: 0,
    max,
    encoding: 'int16-le-metres',
  }
}

const OPTS: TerrainTextureOptions = { ...DEFAULT_TERRAIN_OPTIONS, supersample: 1 }

describe('terrainTexture', () => {
  describe('happy path', () => {
    it('builds an sRGB DataTexture with flipY set and matching dimensions', () => {
      const hm = createHeightmap(meta(3, 2, 800), new Int16Array([0, 0, 0, 800, 800, 800]))
      const tex = createTerrainTexture(hm, OPTS)
      expect(tex).toBeInstanceOf(DataTexture)
      expect(tex.flipY).toBe(true)
      expect(tex.colorSpace).toBe(SRGBColorSpace)
      expect(tex.image.width).toBe(3)
      expect(tex.image.height).toBe(2)
      expect(tex.image.data?.length).toBe(3 * 2 * 4)
    })

    it('wraps a buffer computed elsewhere — the seam a worker bake returns through', () => {
      const rgba = new Uint8Array(2 * 2 * 4).fill(200)
      const tex = wrapTerrainTexture(rgba, 2, 2)
      expect(tex.image.data).toBe(rgba) // wrapped, never copied: the bytes are transferred in
      expect(tex.minFilter).toBe(LinearMipmapLinearFilter)
      expect(tex.generateMipmaps).toBe(true)
      // `needsUpdate` is a write-only accessor (three's Texture.js): reading it yields undefined, and
      // the upload it schedules is observable through the version counter instead.
      expect(tex.version).toBeGreaterThan(0)
    })
  })

  describe('variants', () => {
    it('sizes the texture by supersample, matching the buffer it wraps', () => {
      const hm = createHeightmap(meta(3, 2, 800), new Int16Array([0, 0, 0, 800, 800, 800]))
      const tex = createTerrainTexture(hm, { ...OPTS, supersample: 2 })
      expect(tex.image.width).toBe(6)
      expect(tex.image.height).toBe(4)
      expect(tex.image.data?.length).toBe(6 * 4 * 4)
    })
  })

  // L3: N/A — the wrapper has no branch to take. Its only input is a buffer the compositor sized, and
  // `composeTerrainRgba` (tested next door) is what validates the elevation source.
  // L4: N/A — nothing async, nothing thrown; a mismatched buffer is a three.js-level programming error
  // that no fallback here could make safe.

  describe('edge cases', () => {
    it('handles a 1x1 grid', () => {
      const hm = createHeightmap(meta(1, 1, 100), new Int16Array([50]))
      const tex = createTerrainTexture(hm, OPTS)
      expect(tex.image.width).toBe(1)
      expect(tex.image.height).toBe(1)
      expect(tex.image.data?.length).toBe(4)
    })

    it('frees its GPU handle on dispose without touching the buffer', () => {
      const rgba = new Uint8Array(4).fill(1)
      const tex = wrapTerrainTexture(rgba, 1, 1)
      expect(() => {
        tex.dispose()
      }).not.toThrow()
      expect(rgba[0]).toBe(1)
    })
  })
})
