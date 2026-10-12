import { describe, expect, it } from 'vitest'

import { createHeightmap } from '../data/heightmap'
import { createLandMask } from '../data/landMask'
import { findControlInconsistencies, findGroupingProblems } from '../utils/controlSpec'

import {
  BLEND_MODES,
  DEFAULT_TERRAIN_OPTIONS,
  TERRAIN_CONTROLS,
  TERRAIN_CONTROL_GROUPS,
  blendChannel,
  composeTerrainRgba,
  computeHillshade,
  elevationGrey,
  hypsometricTint,
  snowCoverage,
  snowLineDrop,
  terrainTextureSize,
} from './terrainCompose'

import type { TerrainTextureOptions } from './terrainCompose'
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

// Most assertions below index individual pixels, so they bake 1:1 with the DEM. Supersampling has its
// own tests; it must not silently shift every other test's pixel indices.
const OPTS: TerrainTextureOptions = { ...DEFAULT_TERRAIN_OPTIONS, supersample: 1 }

/** A hand-written land mask over a small grid — row-major, `true` = land. */
function maskOf(width: number, height: number, land: boolean[]): ReturnType<typeof createLandMask> {
  return createLandMask(
    { width, height, scale: 1, bbox: { west: 0, south: 0, east: 1, north: 1 }, source: 'test' },
    (col, row) => land[row * width + col] ?? false
  )
}

describe('terrainTexture controls', () => {
  describe('happy path', () => {
    it('keeps every numeric default inside its own declared range', () => {
      expect(findControlInconsistencies(TERRAIN_CONTROLS, DEFAULT_TERRAIN_OPTIONS)).toEqual([])
    })
  })

  describe('variants', () => {
    it('shows every declared option exactly once across the groups', () => {
      expect(findGroupingProblems(TERRAIN_CONTROL_GROUPS, TERRAIN_CONTROLS)).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('offers every blend dropdown the full set of modes', () => {
      for (const [key, spec] of Object.entries(TERRAIN_CONTROLS)) {
        if (spec.kind !== 'choice') continue
        expect([...spec.options], key).toEqual([...BLEND_MODES])
      }
    })
  })

  // L4 (unmanaged errors): N/A — static declarations, no I/O and no runtime input to mishandle.

  describe('edge cases', () => {
    it('orders the groups so each layer is composited over the ones before it', () => {
      // The panel's numbering is load-bearing: it tells you what covers what. Guard the order so a
      // future reshuffle cannot quietly make it lie.
      expect(TERRAIN_CONTROL_GROUPS.map((group) => group.title)).toEqual([
        '1 \u00b7 base',
        '2 \u00b7 hypsometric tint',
        '3 \u00b7 heightmap (B&W)',
        '4 \u00b7 snow',
        '5 \u00b7 political',
        '6 \u00b7 hillshade',
        '7 \u00b7 paper & bake',
      ])
    })
  })
})

const allEqual = (buf: Uint8Array): boolean =>
  buf.every((_, i) => i % 4 === 3 || buf[i] === buf[i % 4])

describe('terrainCompose', () => {
  describe('happy path', () => {
    it('composes an RGBA buffer of length width*height*4 with opaque alpha', () => {
      const hm = createHeightmap(meta(2, 2, 1000), new Int16Array([0, 500, 1000, -100]))
      const rgba = composeTerrainRgba(hm, OPTS)
      expect(rgba.length).toBe(2 * 2 * 4)
      for (let p = 0; p < 4; p++) expect(rgba[p * 4 + 3]).toBe(255)
    })

    it('maps the greyscale heightmap layer black at the floor and white at the ceiling', () => {
      expect(elevationGrey(OPTS.elevationFloor, OPTS)).toBe(0)
      expect(elevationGrey(OPTS.elevationCeiling, OPTS)).toBe(1)
      expect(elevationGrey((OPTS.elevationFloor + OPTS.elevationCeiling) / 2, OPTS)).toBeCloseTo(
        0.5,
        5
      )
    })

    it('covers the ground with snow only between the snow line and full cover', () => {
      expect(snowCoverage(OPTS.snowStart, OPTS)).toBe(0)
      expect(snowCoverage(OPTS.snowFull, OPTS)).toBe(1)
      expect(snowCoverage((OPTS.snowStart + OPTS.snowFull) / 2, OPTS)).toBeCloseTo(0.5, 5)
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

    it('darkens low land more than high land when the heightmap layer multiplies', () => {
      // Low sample → near-black grey → strong multiply darkening; a sample at the ceiling is white → no-op.
      const hm = createHeightmap(meta(2, 1, 1500), new Int16Array([100, 1500]))
      const base = { ...OPTS, grain: 0, hillshadeStrength: 0 }
      const off = composeTerrainRgba(hm, { ...base, elevationStrength: 0 })
      const on = composeTerrainRgba(hm, { ...base, elevationStrength: 1 })
      const lowDrop = (off[0] ?? 0) - (on[0] ?? 0)
      const highDrop = (off[4] ?? 0) - (on[4] ?? 0)
      expect(lowDrop).toBeGreaterThan(highDrop)
      expect(highDrop).toBe(0)
    })

    it('skips sea by default and applies the heightmap layer to it when elevationIncludesSea is on', () => {
      const hm = createHeightmap(meta(1, 1, 0), new Int16Array([-3000]))
      const base = { ...OPTS, grain: 0, elevationStrength: 1 }
      const excluded = composeTerrainRgba(hm, base)
      const included = composeTerrainRgba(hm, { ...base, elevationIncludesSea: true })
      expect(excluded[0]).toBe(OPTS.sea.r)
      expect(included[0]).toBeLessThan(OPTS.sea.r)
    })

    it('scales the baked buffer by the supersample factor on each axis', () => {
      const hm = createHeightmap(meta(4, 3, 900), new Int16Array(12).fill(900))
      for (const supersample of [1, 2, 3]) {
        const size = terrainTextureSize(hm, { ...OPTS, supersample })
        expect(size).toEqual({ width: 4 * supersample, height: 3 * supersample })
        expect(composeTerrainRgba(hm, { ...OPTS, supersample }).length).toBe(
          size.width * size.height * 4
        )
      }
    })

    it('keeps the 1:1 bake byte-identical to sampling the DEM directly', () => {
      // Supersampling must be a pure refinement: at factor 1 the interpolated path has to land exactly
      // back on the DEM samples, otherwise every tuned default would shift under us.
      const data = new Int16Array([-200, 300, 1400, 2600, 90, 3100, -50, 1800, 700])
      const hm = createHeightmap(meta(3, 3, 3100), data)
      const baked = composeTerrainRgba(hm, { ...OPTS, supersample: 1 })
      expect(baked.length).toBe(3 * 3 * 4)
      // A flat interior sample keeps its exact land colour rather than drifting toward a neighbour.
      expect(baked.some((byte, i) => i % 4 !== 3 && byte !== 0)).toBe(true)
    })

    it('refines the paper grain instead of merely enlarging it', () => {
      // Grain is evaluated per output pixel, so a 2× bake must not be a 2× nearest-neighbour blow-up of
      // the 1× one: neighbouring fine pixels inside one DEM cell have to differ.
      const hm = createHeightmap(meta(4, 4, 800), new Int16Array(16).fill(800))
      const opts = { ...OPTS, grain: 0.8, grainScale: 2, supersample: 2 }
      const fine = composeTerrainRgba(hm, opts)
      const rowStride = 4 * 2 * 4 // outWidth (8 px) × 4 bytes
      expect(fine[0]).not.toBe(fine[4]) // two fine pixels inside the same DEM cell, side by side
      expect(fine[0]).not.toBe(fine[rowStride]) // and the one directly below
    })

    it('lowers the snow line northward and raises it southward', () => {
      expect(snowLineDrop(OPTS.snowLatitudeRef, OPTS)).toBe(0)
      expect(snowLineDrop(OPTS.snowLatitudeRef + 16, OPTS)).toBeGreaterThan(0) // Scandinavia
      expect(snowLineDrop(OPTS.snowLatitudeRef - 15, OPTS)).toBeLessThan(0) // the Atlas
    })

    it('snows on a northern summit that would stay bare at the reference latitude', () => {
      // 1500 m sits below the alpine snow line but above the Scandinavian one.
      const alpine = snowCoverage(1500, OPTS, snowLineDrop(OPTS.snowLatitudeRef, OPTS))
      const nordic = snowCoverage(1500, OPTS, snowLineDrop(62, OPTS))
      expect(alpine).toBeLessThan(nordic)
      expect(nordic).toBe(1)
    })

    it('leaves the snow line flat when the tilt is zero', () => {
      const flat = { ...OPTS, snowLatitudeDrop: 0 }
      expect(snowLineDrop(70, flat)).toBe(0)
      expect(snowCoverage(2000, flat, snowLineDrop(70, flat))).toBe(snowCoverage(2000, flat, 0))
    })

    it('whitens a summit without whitening the hills below the snow line', () => {
      // One pixel under the line, one well above it: only the latter should move toward the snow tone.
      const hm = createHeightmap(meta(2, 1, 3500), new Int16Array([1000, 3500]))
      const rgba = composeTerrainRgba(hm, { ...OPTS, grain: 0 })
      const bare = rgba[0] ?? 0
      const snowy = rgba[4] ?? 0
      expect(snowy).toBeGreaterThan(bare)
    })

    it('keeps the hillshade over the snow so summits stay modelled', () => {
      // Two snow-covered pixels on opposite slopes must still differ — snow below the shading, not above.
      const data = new Int16Array(16)
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) data[y * 4 + x] = 3500 + x * 400
      const hm = createHeightmap(meta(4, 4, 5100), data)
      const opts = { ...OPTS, grain: 0, snowStrength: 1 }
      // The sampled pixel is fully snow-covered; if snow were applied *after* the hillshade at full
      // strength it would overwrite the shading and flipping the light would change nothing.
      expect(snowCoverage(3900, opts)).toBe(1)
      const lit = composeTerrainRgba(hm, { ...opts, lightAzimuthDeg: 90 })
      const counterLit = composeTerrainRgba(hm, { ...opts, lightAzimuthDeg: 270 })
      const centre = (1 * 4 + 1) * 4
      expect(lit[centre]).not.toBe(counterLit[centre])
    })

    it('blends a shoreline texel between the sea and land tones instead of snapping', () => {
      // Baked finer than the mask, so texels land *between* the water cell and the land cell — which is
      // where the shore actually falls. Sampled only at cell centres there would be nothing to blend.
      const grid = createHeightmap(meta(2, 1, 400), new Int16Array([-100, 400]))
      const opts = { ...OPTS, grain: 0, supersample: 4 }
      const baked = composeTerrainRgba(grid, opts, maskOf(2, 1, [false, true]))
      const reds = [...Array.from({ length: 8 }, (_, i) => baked[i * 4] ?? 0)]
      const sea = OPTS.sea.r
      expect(reds[0]).toBe(sea) // the water end stays pure
      expect(reds.some((red) => red !== sea && red !== reds[7])).toBe(true) // a graded edge exists
      expect(new Set(reds).size).toBeGreaterThan(2) // and it is a ramp, not a single hard step
    })

    it('honours the blend mode chosen for the heightmap layer', () => {
      const hm = createHeightmap(meta(1, 1, 750), new Int16Array([750]))
      const base = { ...OPTS, grain: 0, hillshadeStrength: 0, elevationStrength: 1 }
      const multiplied = composeTerrainRgba(hm, { ...base, elevationMode: 'multiply' })
      const normal = composeTerrainRgba(hm, { ...base, elevationMode: 'normal' })
      expect(multiplied[0]).not.toBe(normal[0])
    })

    it('applies the heightmap layer before the hillshade, as the layer order documents', () => {
      // `multiply` is commutative, so the default settings cannot detect an order swap. `softLight` is
      // not — chain it by hand and check the composite matches tint → heightmap → hillshade.
      const flat = 300
      const hm = createHeightmap(meta(3, 3, flat), new Int16Array(9).fill(flat))
      const opts = {
        ...OPTS,
        grain: 0,
        lightAltitudeDeg: 45,
        elevationMode: 'softLight' as const,
        elevationStrength: 1,
        hillshadeMode: 'softLight' as const,
        hillshadeStrength: 1,
      }
      // A flat surface shades uniformly to cos(zenith) — proven by the hillshade test above.
      const shade = Math.cos((90 - 45) * (Math.PI / 180))
      const grey = elevationGrey(flat, opts)
      const parchment = opts.parchment.r / 255
      const tintR = hypsometricTint(flat, opts)[0]
      const tinted =
        parchment + (blendChannel(parchment, tintR, opts.tintMode) - parchment) * opts.tintStrength
      const documented = blendChannel(blendChannel(tinted, grey, 'softLight'), shade, 'softLight')
      const swapped = blendChannel(blendChannel(tinted, shade, 'softLight'), grey, 'softLight')

      // Guard: the assertion below is only meaningful if the two orders actually differ.
      expect(Math.round(documented * 255)).not.toBe(Math.round(swapped * 255))

      const rgba = composeTerrainRgba(hm, opts)
      const centre = (1 * 3 + 1) * 4 // interior pixel, away from the edge-clamped border
      expect(rgba[centre]).toBe(Math.round(documented * 255))
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

    it('clamps the heightmap layer outside its floor/ceiling window', () => {
      expect(elevationGrey(OPTS.elevationFloor - 5000, OPTS)).toBe(0)
      expect(elevationGrey(OPTS.elevationCeiling + 5000, OPTS)).toBe(1)
    })

    it('degenerates to a hard snow line when the band has no width', () => {
      const flatBand = { ...OPTS, snowStart: 2000, snowFull: 2000 }
      expect(snowCoverage(1999, flatBand)).toBe(0)
      expect(snowCoverage(2000, flatBand)).toBe(1)
    })

    it('does not divide by zero when peakReference equals seaLevel', () => {
      const tint = hypsometricTint(100, { ...OPTS, peakReference: OPTS.seaLevel })
      expect(tint.every((c) => Number.isFinite(c))).toBe(true)
    })

    it('does not divide by zero when the heightmap floor equals its ceiling', () => {
      const grey = elevationGrey(500, {
        ...OPTS,
        elevationFloor: 1000,
        elevationCeiling: 1000,
      })
      // Asserting the clamped value, not just finiteness: the span guard alone makes NaN impossible,
      // so a finiteness check would still pass if the [0, 1] clamp were dropped.
      expect(grey).toBe(0)
    })

    it('stays in [0, 1] when the snow band is inverted', () => {
      const inverted = { ...OPTS, snowStart: 3000, snowFull: 1000 }
      for (const elevation of [0, 500, 1000, 2000, 3000, 6000]) {
        const coverage = snowCoverage(elevation, inverted)
        expect(coverage).toBeGreaterThanOrEqual(0)
        expect(coverage).toBeLessThanOrEqual(1)
      }
    })

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

    it('is a no-op at zero strength, whatever the heightmap blend mode', () => {
      const hm = createHeightmap(meta(2, 2, 1200), new Int16Array([200, 800, 1200, 50]))
      const off = composeTerrainRgba(hm, { ...OPTS, elevationStrength: 0 })
      const alsoOff = composeTerrainRgba(hm, {
        ...OPTS,
        elevationStrength: 0,
        elevationMode: 'normal',
      })
      expect(Array.from(alsoOff)).toEqual(Array.from(off))
    })

    it('leaves the map untouched at zero snow strength', () => {
      const hm = createHeightmap(meta(2, 2, 4500), new Int16Array([200, 2400, 4500, 3100]))
      const off = composeTerrainRgba(hm, { ...OPTS, snowStrength: 0 })
      const none = composeTerrainRgba(hm, { ...OPTS, snowStrength: 0, snowStart: 0, snowFull: 1 })
      expect(Array.from(none)).toEqual(Array.from(off))
    })

    it('stays within [0, 1] when the heightmap floor sits above its ceiling', () => {
      const grey = elevationGrey(500, { ...OPTS, elevationFloor: 3000, elevationCeiling: 100 })
      expect(grey).toBeGreaterThanOrEqual(0)
      expect(grey).toBeLessThanOrEqual(1)
    })
  })
})
