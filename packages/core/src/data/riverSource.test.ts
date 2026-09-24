import { describe, expect, it, vi } from 'vitest'

import { verticalToLatitude } from '../geo/mercator'

import { createHeightmap } from './heightmap'
import { createElevationLandMask } from './landMask'
import {
  DEFAULT_RIVER_EXTENSION,
  createFetchRiverSource,
  extendRiversToSea,
  projectRivers,
} from './riverSource'

import type { River, RiverPayload } from './riverSource'

/** The DEM's real bounds — every reprojection in the app is relative to this frame. */
const BBOX = { west: -45, south: 11.178401873711783, east: 78.75, north: 76.84081641443098 }

/** Build a payload around the given rivers. */
function payload(rivers: RiverPayload['rivers']): RiverPayload {
  return { source: 'test', bbox: BBOX, precision: 4, tolerance: 0, rivers }
}

describe('riverSource', () => {
  describe('happy path', () => {
    it('reprojects lon/lat into normalized grid coordinates', () => {
      const [river] = projectRivers(
        payload([
          {
            rank: 1,
            kind: 'River',
            name: 'Test',
            points: [
              [BBOX.west, BBOX.north],
              [BBOX.east, BBOX.south],
            ],
          },
        ])
      )
      expect(river?.points[0]?.u).toBeCloseTo(0, 9)
      expect(river?.points[0]?.v).toBeCloseTo(0, 9)
      expect(river?.points[1]?.u).toBeCloseTo(1, 9)
      expect(river?.points[1]?.v).toBeCloseTo(1, 9)
    })

    it('carries the rank, kind and name through untouched', () => {
      const [river] = projectRivers(
        payload([
          {
            rank: 4,
            kind: 'Lake Centerline',
            name: 'Vorma',
            points: [
              [0, 50],
              [1, 51],
            ],
          },
        ])
      )
      expect(river).toMatchObject({ rank: 4, kind: 'Lake Centerline', name: 'Vorma' })
    })
  })

  describe('variants', () => {
    it('projects latitude through mercator, not as a linear degree ramp', () => {
      // The bug this guards: lerping degrees would put the mid-row at ~44°N instead of ~56°N.
      const middle = (BBOX.north + BBOX.south) / 2
      const [river] = projectRivers(
        payload([
          {
            rank: 1,
            kind: 'River',
            name: null,
            points: [
              [0, middle],
              [1, middle],
            ],
          },
        ])
      )
      const v = river?.points[0]?.v ?? 0
      expect(v).not.toBeCloseTo(0.5, 2)
      expect(verticalToLatitude(v, BBOX)).toBeCloseTo(middle, 9)
    })

    it('keeps longitude linear across the frame', () => {
      const middle = (BBOX.west + BBOX.east) / 2
      const [river] = projectRivers(
        payload([
          {
            rank: 1,
            kind: 'River',
            name: null,
            points: [
              [middle, 50],
              [middle, 51],
            ],
          },
        ])
      )
      expect(river?.points[0]?.u).toBeCloseTo(0.5, 9)
    })

    it('fetches and reprojects through the source port', async () => {
      const body = payload([
        {
          rank: 2,
          kind: 'River',
          name: 'Rhine',
          points: [
            [8, 50],
            [7, 51],
          ],
        },
      ])
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) })
      vi.stubGlobal('fetch', fetchMock)
      const rivers = await createFetchRiverSource('/rivers/x.json').load()
      expect(fetchMock).toHaveBeenCalledWith('/rivers/x.json')
      expect(rivers).toHaveLength(1)
      expect(rivers[0]?.name).toBe('Rhine')
      vi.unstubAllGlobals()
    })
  })

  describe('managed errors', () => {
    it('drops a polyline with fewer than two points', () => {
      const rivers = projectRivers(
        payload([
          { rank: 1, kind: 'River', name: 'Stub', points: [[0, 50]] },
          {
            rank: 1,
            kind: 'River',
            name: 'Real',
            points: [
              [0, 50],
              [1, 51],
            ],
          },
        ])
      )
      expect(rivers.map((river) => river.name)).toEqual(['Real'])
    })

    it('surfaces a failed fetch instead of returning an empty network', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
      await expect(createFetchRiverSource('/rivers/missing.json').load()).rejects.toThrow(
        /rivers \(transport\) \/rivers\/missing\.json: HTTP 404/
      )
      vi.unstubAllGlobals()
    })
  })

  describe('unmanaged errors', () => {
    it('propagates a network rejection rather than swallowing it', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
      await expect(createFetchRiverSource('/rivers/x.json').load()).rejects.toThrow('offline')
      vi.unstubAllGlobals()
    })
  })

  describe('edge cases', () => {
    it('returns an empty list for an empty payload', () => {
      expect(projectRivers(payload([]))).toEqual([])
    })

    it('extrapolates outside the frame rather than clamping to its edge', () => {
      // A caller needs to know a feature fell outside the box, not have it snapped onto the border.
      const [river] = projectRivers(
        payload([
          {
            rank: 1,
            kind: 'River',
            name: null,
            points: [
              [BBOX.west - 10, 50],
              [BBOX.east + 10, 50],
            ],
          },
        ])
      )
      expect(river?.points[0]?.u).toBeLessThan(0)
      expect(river?.points[1]?.u).toBeGreaterThan(1)
    })
  })
})

/**
 * A 20x20 grid whose western third is sea (-100 m) and the rest land (500 m), so a westward river
 * meets the coast at u = 1/3.
 */
function coastalGrid(): ReturnType<typeof createHeightmap> {
  const size = 20
  const data = new Int16Array(size * size)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) data[y * size + x] = x < size / 3 ? -100 : 500
  return createHeightmap(
    {
      width: size,
      height: size,
      zoom: 5,
      bbox: BBOX,
      min: -100,
      max: 500,
      encoding: 'int16-le-metres',
    },
    data
  )
}

/** The same grid seen as a land/water mask — what the extension actually consumes. */
function coastalMask(): ReturnType<typeof createElevationLandMask> {
  return createElevationLandMask(coastalGrid(), 0)
}

/** Extension settings scaled to the small test grid. */
const EXT = { ...DEFAULT_RIVER_EXTENSION, step: 0.01, maxDistance: 0.6, junctionRadius: 0.02 }

/** A river running due west toward the coast, from land. */
function westward(name: string, fromU = 0.9): River {
  return {
    rank: 1,
    kind: 'River',
    name,
    points: [
      { u: fromU, v: 0.5 },
      { u: fromU - 0.1, v: 0.5 },
    ],
  }
}

describe('extendRiversToSea', () => {
  describe('happy path', () => {
    it('carries a mouth on to the shoreline', () => {
      const [river] = extendRiversToSea([westward('Test')], coastalMask(), EXT)
      const tip = river?.points[river.points.length - 1]
      expect(river?.points.length).toBeGreaterThan(2)
      expect(coastalMask().isLand(tip?.u ?? 1, tip?.v ?? 0)).toBe(false)
    })
  })

  describe('variants', () => {
    it('leaves a river that already reaches the water alone', () => {
      const atSea: River = {
        rank: 1,
        kind: 'River',
        name: 'Done',
        points: [
          { u: 0.5, v: 0.5 },
          { u: 0.2, v: 0.5 },
        ],
      }
      expect(extendRiversToSea([atSea], coastalMask(), EXT)[0]?.points).toHaveLength(2)
    })

    it('extends whichever end faces the sea, not just the last one', () => {
      // Same river, digitised the other way round: the dataset guarantees no flow ordering.
      const reversed: River = {
        ...westward('Test'),
        points: [...westward('Test').points].reverse(),
      }
      expect(extendRiversToSea([reversed], coastalMask(), EXT)[0]?.points.length).toBeGreaterThan(2)
    })

    it('finds the coast through the search arc when the last segment points off-course', () => {
      // A meander leaves the final heading pointing north; only the arc sweep recovers the westward sea.
      const meander: River = {
        rank: 1,
        kind: 'River',
        name: 'Meander',
        points: [
          { u: 0.5, v: 0.8 },
          { u: 0.5, v: 0.5 },
        ],
      }
      const wide = extendRiversToSea([meander], coastalMask(), { ...EXT, searchArcDeg: 90 })
      expect(wide[0]?.points.length).toBeGreaterThan(2)
      const narrow = extendRiversToSea([meander], coastalMask(), { ...EXT, searchArcDeg: 0 })
      expect(narrow[0]?.points).toHaveLength(2)
    })
  })

  describe('managed errors', () => {
    it('leaves a confluence alone rather than inventing a second channel', () => {
      // A tributary ending where a main river runs past must not be handed its own route to the sea.
      const main = westward('Main')
      const tributary: River = {
        rank: 5,
        kind: 'River',
        name: 'Tributary',
        points: [
          { u: 0.9, v: 0.2 },
          { u: 0.8, v: 0.5 }, // lands on the main river's course
        ],
      }
      const [, extendedTributary] = extendRiversToSea([main, tributary], coastalMask(), EXT)
      expect(extendedTributary?.points).toHaveLength(2)
    })

    it('leaves a headwater alone when no heading reaches the sea in range', () => {
      const source = westward('Source')
      expect(
        extendRiversToSea([source], coastalMask(), { ...EXT, maxDistance: 0.05 })[0]?.points
      ).toHaveLength(2)
    })
  })

  describe('unmanaged errors', () => {
    it('does not loop forever on a zero-length final segment', () => {
      const degenerate: River = {
        rank: 1,
        kind: 'River',
        name: 'Still',
        points: [
          { u: 0.9, v: 0.5 },
          { u: 0.9, v: 0.5 },
        ],
      }
      expect(extendRiversToSea([degenerate], coastalMask(), EXT)[0]?.points).toHaveLength(2)
    })
  })

  describe('edge cases', () => {
    it('stops at the frame edge instead of marching out of the grid', () => {
      // Runs north-south on the landward side: with no arc, one end walks off the top of the frame and
      // the other off the bottom, so neither finds water and neither may be clamped onto the border.
      const northSouth: River = {
        rank: 1,
        kind: 'River',
        name: 'Away',
        points: [
          { u: 0.9, v: 0.6 },
          { u: 0.9, v: 0.4 },
        ],
      }
      expect(
        extendRiversToSea([northSouth], coastalMask(), { ...EXT, searchArcDeg: 0 })[0]?.points
      ).toHaveLength(2)
    })

    it('returns a single-point polyline untouched', () => {
      const stub: River = { rank: 1, kind: 'River', name: null, points: [{ u: 0.9, v: 0.5 }] }
      expect(extendRiversToSea([stub], coastalMask(), EXT)[0]?.points).toHaveLength(1)
    })

    it('preserves the rank, kind and name of every river', () => {
      const [river] = extendRiversToSea([westward('Keep')], coastalMask(), EXT)
      expect(river).toMatchObject({ rank: 1, kind: 'River', name: 'Keep' })
    })
  })
})
