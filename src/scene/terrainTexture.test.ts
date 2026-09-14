import { DataTexture, SRGBColorSpace } from 'three'
import { describe, expect, it } from 'vitest'

import { createHeightmap } from '../data/heightmap'

import {
  DEFAULT_TERRAIN_OPTIONS,
  blendChannel,
  composeTerrainRgba,
  computeHillshade,
  createTerrainTexture,
  hypsometricTint,
} from './terrainTexture'

import type { HeightmapMeta } from '../data/heightmap'

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

const OPTS = DEFAULT_TERRAIN_OPTIONS

describe('terrainTexture', () => {
  describe('happy path', () => {
    it('composes an RGBA buffer of length width*height*4 with opaque alpha', () => {
      const hm = createHeightmap(meta(2, 2, 1000), new Int16Array([0, 500, 1000, -100]))
      const rgba = composeTerrainRgba(hm, OPTS)
      expect(rgba.length).toBe(2 * 2 * 4)
      for (let p = 0; p < 4; p++) expect(rgba[p * 4 + 3]).toBe(255)
    })

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
  })

  describe('variants', () => {
    it('blends channels per mode (multiply/normal/overlay/softLight)', () => {
      expect(blendChannel(0.4, 1, 'multiply')).toBeCloseTo(0.4, 5)
      expect(blendChannel(0.4, 0, 'multiply')).toBeCloseTo(0, 5)
      expect(blendChannel(0.4, 0.7, 'normal')).toBeCloseTo(0.7, 5)
      // overlay at base<0.5 darkens toward 2*base*top
      expect(blendChannel(0.25, 0.5, 'overlay')).toBeCloseTo(0.25, 5)
      // softLight with top=0.5 is the identity (Pegtop)
      expect(blendChannel(0.6, 0.5, 'softLight')).toBeCloseTo(0.6, 5)
    })

    it('maps elevation to the hypsometric tint (lowland at sea level, highland at the peak reference)', () => {
      const low = hypsometricTint(OPTS.seaLevel, OPTS)
      const high = hypsometricTint(OPTS.peakReference, OPTS)
      expect(low[0]).toBeCloseTo(OPTS.lowland.r / 255, 5)
      expect(high[0]).toBeCloseTo(OPTS.highland.r / 255, 5)
    })

    it('gives a flat surface a uniform hillshade equal to cos(zenith)', () => {
      const hm = createHeightmap(meta(3, 3, 500), new Int16Array(9).fill(500))
      const shade = computeHillshade(hm, { ...OPTS, lightAltitudeDeg: 45 })
      const expected = Math.cos((90 - 45) * (Math.PI / 180))
      for (const s of shade) expect(s).toBeCloseTo(expected, 5)
    })

    it('modulates flat land with vellum grain (spatial variation) only when grain > 0', () => {
      // Uniform land elevation → without grain every pixel is identical; with grain the paper mottles it.
      const hm = createHeightmap(meta(8, 8, 800), new Int16Array(64).fill(800))
      const flat = composeTerrainRgba(hm, { ...OPTS, grain: 0 })
      const grained = composeTerrainRgba(hm, { ...OPTS, grain: 0.6 })
      const allEqual = (buf: Uint8Array): boolean =>
        buf.every((_, i) => i % 4 === 3 || buf[i] === buf[i % 4])
      expect(allEqual(flat)).toBe(true)
      expect(allEqual(grained)).toBe(false)
    })

    it('shades opposite slopes differently when the light azimuth flips 180°', () => {
      // Elevation ramps along +x (pure east-facing slope), constant along y.
      const data = new Int16Array(16)
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) data[y * 4 + x] = x * 400
      const hm = createHeightmap(meta(4, 4, 1200), data)
      const a = computeHillshade(hm, { ...OPTS, lightAzimuthDeg: 90 })
      const b = computeHillshade(hm, { ...OPTS, lightAzimuthDeg: 270 })
      const i = 1 * 4 + 1 // interior pixel
      expect(a[i]).not.toBeCloseTo(b[i] ?? 0, 3)
    })
  })

  describe('managed errors', () => {
    it('paints sea samples with the flat sea tone (no tint, no hillshade)', () => {
      const hm = createHeightmap(meta(1, 1, 0), new Int16Array([-500]))
      const rgba = composeTerrainRgba(hm, { ...OPTS, grain: 0 })
      expect(rgba[0]).toBe(OPTS.sea.r)
      expect(rgba[1]).toBe(OPTS.sea.g)
      expect(rgba[2]).toBe(OPTS.sea.b)
    })

    it('clamps elevations above the peak reference to the highland tint', () => {
      const capped = hypsometricTint(OPTS.peakReference * 5, OPTS)
      const atPeak = hypsometricTint(OPTS.peakReference, OPTS)
      expect(capped).toEqual(atPeak)
    })
  })

  describe('unmanaged errors', () => {
    it('does not divide by zero when peakReference equals seaLevel', () => {
      const tint = hypsometricTint(100, { ...OPTS, peakReference: OPTS.seaLevel })
      expect(tint.every((c) => Number.isFinite(c))).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles a 1×1 heightmap (single pixel, edge-clamped neighbours)', () => {
      const hm = createHeightmap(meta(1, 1, 1000), new Int16Array([1000]))
      const rgba = composeTerrainRgba(hm, OPTS)
      expect(rgba.length).toBe(4)
      expect(rgba[3]).toBe(255)
    })

    it('produces distinct colours for land vs sea samples', () => {
      const hm = createHeightmap(meta(2, 1, 1500), new Int16Array([-200, 1500]))
      const rgba = composeTerrainRgba(hm, { ...OPTS, grain: 0 })
      const sea = [rgba[0], rgba[1], rgba[2]]
      const land = [rgba[4], rgba[5], rgba[6]]
      expect(land).not.toEqual(sea)
    })
  })
})
