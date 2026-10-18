import { afterEach, describe, expect, it, vi } from 'vitest'

import { moveAnchors } from '@europe-historical-atlas/core/editor/documentEdits'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import * as featherModule from '@europe-historical-atlas/core/editor/tribeFeather'
import {
  latitudeToVertical,
  longitudeToHorizontal,
} from '@europe-historical-atlas/core/geo/mercator'
import * as distanceModule from '@europe-historical-atlas/core/geo/signedDistance'

import { lonLatToBackdrop } from '../../viewport/projection'
import { TEST_BACKDROP_FRAME } from '../../viewport/testFrame'

import { createGridProjection, tribeFeatherRasters } from './tribeFeathers'

import type { FeatherGround, TribeFeatherRaster } from './tribeFeathers'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/** The Empire (2°E–4°E, 46°N–48°N) made a tribe, beside the kingdom of France (0°–2°E). */
const withTribe = (): YearDocument => {
  const doc = sharedBorderDocument()
  const hre = doc.polities.find((polity) => polity.id === 'hre')
  if (hre) hre.rank = 'tribe'
  return doc
}

const COLOURS = new Map([
  ['fr-couronne', '#aa0000'],
  ['hre', '#41580b'],
])

const DRY = { isLand: (): boolean => true }

/**
 * The ground, overridable.
 * @param over - what to change
 * @returns the ground
 */
const ground = (over: Partial<FeatherGround> = {}): FeatherGround => ({
  frame: TEST_BACKDROP_FRAME,
  feather: { mode: 'inset', widthKm: 30 },
  land: DRY,
  ...over,
})

/**
 * The alpha of the raster's pixel under a position, or `null` off the raster.
 * @param raster - the raster
 * @param lon - longitude
 * @param lat - latitude
 * @returns the alpha, `0..255`
 */
function alphaAt(raster: TribeFeatherRaster | undefined, lon: number, lat: number): number | null {
  if (!raster) return null
  const [x, y] = lonLatToBackdrop([lon, lat], TEST_BACKDROP_FRAME)
  const col = Math.floor(x) - raster.box.x
  const row = Math.floor(y) - raster.box.y
  if (col < 0 || row < 0 || col >= raster.box.width || row >= raster.box.height) return null
  return raster.pixels[4 * (row * raster.box.width + col) + 3] ?? null
}

/**
 * Every alpha of the raster whose pixel centre lies in a lon/lat box.
 * @param raster - the raster
 * @param box - the box, in degrees
 * @param box.west - western edge
 * @param box.east - eastern edge
 * @param box.south - southern edge
 * @param box.north - northern edge
 * @returns the alphas
 */
function alphasIn(
  raster: TribeFeatherRaster | undefined,
  box: { west: number; east: number; south: number; north: number }
): number[] {
  const out: number[] = []
  for (let lon = box.west; lon <= box.east; lon += 0.05)
    for (let lat = box.south; lat <= box.north; lat += 0.05) {
      const alpha = alphaAt(raster, lon, lat)
      if (alpha !== null) out.push(alpha)
    }
  return out
}

afterEach(() => {
  vi.restoreAllMocks()
})

/** The Empire's ground on the backdrop's grid, 2°E–4°E and 46°N–48°N. */
const EMPIRE_ON_GRID = {
  u0: longitudeToHorizontal(2, TEST_BACKDROP_FRAME.bounds),
  u1: longitudeToHorizontal(4, TEST_BACKDROP_FRAME.bounds),
  v0: latitudeToVertical(48, TEST_BACKDROP_FRAME.bounds),
  v1: latitudeToVertical(46, TEST_BACKDROP_FRAME.bounds),
}

describe('tribeFeatherRasters', () => {
  describe('happy path', () => {
    it('makes one raster for the tribe, in its colour', () => {
      const [raster, ...rest] = tribeFeatherRasters(withTribe(), COLOURS, ground())
      expect(rest).toEqual([])
      expect([...(raster?.pixels.slice(0, 3) ?? [])]).toEqual([0x41, 0x58, 0x0b])
    })

    it('is full at the heart of the tribe and empty outside it, in inset', () => {
      const [raster] = tribeFeatherRasters(withTribe(), COLOURS, ground())
      expect(alphaAt(raster, 3, 47)).toBe(255)
      expect(alphaAt(raster, 4.15, 47) ?? 0).toBe(0)
    })
  })

  describe('variants', () => {
    it('spills past the outline over land nobody claims, in outset', () => {
      const [raster] = tribeFeatherRasters(
        withTribe(),
        COLOURS,
        ground({ feather: { mode: 'outset', widthKm: 30 } })
      )
      expect(alphaAt(raster, 4.15, 47)).toBeGreaterThan(0)
    })

    // The dev, 2026-10-18: « si ça déborde, c'est pas bon ».
    it('never spills over the kingdom beside it, in outset', () => {
      const [raster] = tribeFeatherRasters(
        withTribe(),
        COLOURS,
        ground({ feather: { mode: 'outset', widthKm: 30 } })
      )
      const inKingdom = alphasIn(raster, { west: 0.05, east: 1.9, south: 46.05, north: 47.95 })
      expect(inKingdom.length).toBeGreaterThan(0)
      expect(Math.max(...inKingdom)).toBe(0)
    })

    it('never spills over the sea, in outset', () => {
      const wetEast = { isLand: (u: number): boolean => u < (4 - -45) / 123.75 }
      const [raster] = tribeFeatherRasters(
        withTribe(),
        COLOURS,
        ground({ feather: { mode: 'outset', widthKm: 30 }, land: wetEast })
      )
      expect(alphaAt(raster, 4.15, 47) ?? 0).toBe(0)
    })

    it('makes no raster in a year without a tribe', () => {
      expect(tribeFeatherRasters(sharedBorderDocument(), COLOURS, ground())).toEqual([])
    })
  })

  describe('measuring only what decides', () => {
    // QUAL-003: in inset nothing beyond the outline is read, so the neighbours and the land never are.
    it('never builds the neighbours’ field nor reads the land in inset', () => {
      const union = vi.spyOn(distanceModule, 'unionDistanceField')
      const isLand = vi.fn(() => true)
      const [raster] = tribeFeatherRasters(withTribe(), COLOURS, ground({ land: { isLand } }))
      expect(raster).toBeDefined()
      expect(union).not.toHaveBeenCalled()
      expect(isLand).not.toHaveBeenCalled()
    })

    it('reads the land in outset only beyond the outline, never inside it', () => {
      const isLand = vi.fn<(u: number, v: number) => boolean>(() => true)
      const [raster] = tribeFeatherRasters(
        withTribe(),
        COLOURS,
        ground({ feather: { mode: 'outset', widthKm: 30 }, land: { isLand } })
      )
      const pixels = (raster?.box.width ?? 0) * (raster?.box.height ?? 0)
      expect(isLand.mock.calls.length).toBeGreaterThan(0)
      expect(isLand.mock.calls.length).toBeLessThan(pixels)
      const { u0, u1, v0, v1 } = EMPIRE_ON_GRID
      const inside = isLand.mock.calls.filter(([u, v]) => u > u0 && u < u1 && v > v0 && v < v1)
      expect(inside).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('makes no raster for a tribe with no colour', () => {
      expect(tribeFeatherRasters(withTribe(), new Map(), ground())).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('makes no raster for a tribe whose ring names no anchor', () => {
      const doc = withTribe()
      const claim = doc.claims.find((each) => each.polity === 'hre')
      if (claim) claim.rings = [[999, 1000, 1001]]
      expect(tribeFeatherRasters(doc, COLOURS, ground())).toEqual([])
    })
  })

  // QUAL-006, the dev's call of 2026-10-18: never a silent 0 alpha.
  describe('a fade that is not a number', () => {
    it('says so once, naming the tribe, and draws nothing for it, when an opacity is NaN', () => {
      const said = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.spyOn(featherModule, 'tribeOpacityAt').mockReturnValue(Number.NaN)
      expect(tribeFeatherRasters(withTribe(), COLOURS, ground())).toEqual([])
      expect(said).toHaveBeenCalledTimes(1)
      expect(said.mock.calls[0]?.[0]).toMatch(/^\[Cartographer\] .*"Sacrum Imperium" \(hre\)/)
    })

    it('says so and draws nothing for a tribe with an anchor that is not a number', () => {
      const said = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const doc = withTribe()
      moveAnchors(doc, [{ index: 4, to: [Number.NaN, 48] }])
      expect(tribeFeatherRasters(doc, COLOURS, ground())).toEqual([])
      expect(said).toHaveBeenCalledTimes(1)
      expect(said.mock.calls[0]?.[0]).toContain('(hre)')
    })
  })

  describe('edge cases', () => {
    it('draws a hard edge for a width of zero: full inside, nothing outside', () => {
      const [raster] = tribeFeatherRasters(
        withTribe(),
        COLOURS,
        ground({ feather: { mode: 'inset', widthKm: 0 } })
      )
      expect(alphaAt(raster, 2.1, 47)).toBe(255)
      expect(alphaAt(raster, 4.15, 47) ?? 0).toBe(0)
    })

    it('keeps the raster within the backdrop, on whole pixels', () => {
      const [raster] = tribeFeatherRasters(withTribe(), COLOURS, ground())
      expect(Number.isInteger(raster?.box.x)).toBe(true)
      expect(raster?.pixels.length).toBe((raster?.box.width ?? 0) * (raster?.box.height ?? 0) * 4)
    })
  })
})

describe('createGridProjection', () => {
  describe('happy path', () => {
    it('projects an anchor as longitudeToHorizontal and latitudeToVertical do', () => {
      const projection = createGridProjection(TEST_BACKDROP_FRAME)
      const point = projection.pointOf(0, [3, 47])
      expect(point?.u).toBeCloseTo(longitudeToHorizontal(3, TEST_BACKDROP_FRAME.bounds), 12)
      expect(point?.v).toBeCloseTo(latitudeToVertical(47, TEST_BACKDROP_FRAME.bounds), 12)
    })
  })

  describe('variants', () => {
    it('hands back the same point for an anchor that has not moved', () => {
      const projection = createGridProjection(TEST_BACKDROP_FRAME)
      const first = projection.pointOf(0, [3, 47])
      expect(projection.pointOf(0, [3, 47])).toBe(first)
    })

    it('projects again an anchor moved in longitude or in latitude', () => {
      const projection = createGridProjection(TEST_BACKDROP_FRAME)
      const first = projection.pointOf(0, [3, 47])
      expect(projection.pointOf(0, [3.5, 47])?.u).not.toBe(first?.u)
      expect(projection.pointOf(0, [3.5, 47.5])?.v).not.toBe(first?.v)
    })
  })

  describe('managed errors', () => {
    it('answers undefined for an index with no anchor', () => {
      expect(createGridProjection(TEST_BACKDROP_FRAME).pointOf(7, undefined)).toBeUndefined()
    })
  })

  describe('unmanaged errors', () => {
    it('carries a NaN position through as a NaN point', () => {
      expect(createGridProjection(TEST_BACKDROP_FRAME).pointOf(0, [Number.NaN, 47])?.u).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('keeps a NaN anchor projected rather than projecting it at every call', () => {
      const projection = createGridProjection(TEST_BACKDROP_FRAME)
      const first = projection.pointOf(0, [Number.NaN, 47])
      expect(projection.pointOf(0, [Number.NaN, 47])).toBe(first)
    })
  })
})
