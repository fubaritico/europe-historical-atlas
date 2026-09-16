import { describe, expect, it, vi } from 'vitest'

import { createLandMask } from '../data/landMask'

import { createInlineMapCompute, rasterFromResult, scaleProgress } from './inlineCompute'
import { DEFAULT_TERRAIN_OPTIONS } from './terrainCompose'

import type { ComputePhase, ComputeSources, PoliticalRequest, ProgressReport } from './mapCompute'
import type { TerrainTextureOptions } from './terrainCompose'
import type { HeightmapMeta } from '../data/heightmap'
import type { Region } from '../data/regionSource'
import type { RgbColor } from '../utils/color'

/** Build minimal metadata for a test grid. */
function meta(width: number, height: number): HeightmapMeta {
  return {
    width,
    height,
    zoom: 5,
    bbox: { west: 0, south: 0, east: 1, north: 1 },
    min: 0,
    max: 1000,
    encoding: 'int16-le-metres',
  }
}

/** A polity covering a rectangle of the unit square. */
function box(name: string | null, u0: number, v0: number, u1: number, v1: number): Region {
  return {
    name,
    subjectTo: null,
    partOf: null,
    rings: [
      [
        { u: u0, v: v0 },
        { u: u1, v: v0 },
        { u: u1, v: v1 },
        { u: u0, v: v1 },
      ],
    ],
  }
}

/** An 8x8 elevation grid, all land at 500 m. */
function sources(landBits?: Uint8Array): ComputeSources {
  const heightmap = { meta: meta(8, 8), data: new Int16Array(64).fill(500) }
  return landBits
    ? {
        heightmap,
        landMask: {
          meta: { width: 8, height: 8, scale: 1, bbox: { west: 0, south: 0, east: 1, north: 1 } },
          bits: landBits,
        },
      }
    : { heightmap, landMask: null }
}

/** Every cell land, packed — built through the real mask so the fixture cannot drift from the format. */
const ALL_LAND = createLandMask(
  { width: 8, height: 8, scale: 1, bbox: { west: 0, south: 0, east: 1, north: 1 } },
  () => true
).pack()

const PALETTE: RgbColor[] = [
  { r: 10, g: 20, b: 30 },
  { r: 40, g: 50, b: 60 },
]

const REQUEST: PoliticalRequest = {
  regions: [box('Alpha', 0, 0, 0.45, 1), box('Beta', 0.55, 0, 1, 1)],
  rasterScale: 1,
  snapToCoast: 0,
  colorBySuzerain: false,
  palette: PALETTE,
  borderSmoothing: 0,
}

const OPTIONS: TerrainTextureOptions = { ...DEFAULT_TERRAIN_OPTIONS, supersample: 1 }

describe('scaleProgress', () => {
  describe('happy path', () => {
    it('maps a job’s own 0..1 onto a slice of the outer bar', () => {
      const outer = vi.fn<ProgressReport>()
      const inner = scaleProgress(outer, 0.2, 0.6)
      inner?.(0, 'rasterise')
      inner?.(0.5, 'expand')
      inner?.(1, 'borders')
      expect(outer.mock.calls.map(([f]) => f)).toEqual([0.2, 0.4, 0.6])
    })
  })

  describe('variants', () => {
    it('passes the phase through untouched', () => {
      const outer = vi.fn<ProgressReport>()
      scaleProgress(outer, 0, 1)?.(0.5, 'bake')
      expect(outer).toHaveBeenCalledWith(0.5, 'bake')
    })
  })

  describe('managed errors', () => {
    it('returns undefined when there is nothing to report to', () => {
      expect(scaleProgress(undefined, 0, 1)).toBeUndefined()
    })
  })

  // L4: N/A — a pure remap with no async path and nothing to throw.

  describe('edge cases', () => {
    it('clamps a fraction outside 0..1 to the slice', () => {
      const outer = vi.fn<ProgressReport>()
      const inner = scaleProgress(outer, 0.2, 0.6)
      inner?.(-1, 'bake')
      inner?.(2, 'bake')
      expect(outer.mock.calls.map(([f]) => f)).toEqual([0.2, 0.6])
    })
  })
})

describe('createInlineMapCompute', () => {
  describe('happy path', () => {
    it('rasterises, colours and derives borders from one request', async () => {
      const compute = createInlineMapCompute()
      await compute.setSources(sources(ALL_LAND))
      const result = await compute.computePolitical(REQUEST)

      expect(result.width).toBe(8)
      expect(result.height).toBe(8)
      expect(result.cells.length).toBe(64)
      expect(result.tints).toHaveLength(2)
      // Two polities side by side over land: they must be told apart, and the line between them drawn.
      expect(result.tints[0]).not.toEqual(result.tints[1])
      expect(result.borders.between.length + result.borders.frontier.length).toBeGreaterThan(0)
    })

    it('bakes an RGBA buffer sized by the texture options', async () => {
      const compute = createInlineMapCompute()
      await compute.setSources(sources())
      const bake = await compute.bakeTerrain(OPTIONS)
      expect(bake.width).toBe(8)
      expect(bake.height).toBe(8)
      expect(bake.rgba.length).toBe(8 * 8 * 4)
    })

    it('announces every phase before it runs, in order', async () => {
      const compute = createInlineMapCompute()
      await compute.setSources(sources(ALL_LAND))
      const seen: ComputePhase[] = []
      await compute.computePolitical(REQUEST, (_, phase) => seen.push(phase))
      expect(seen).toEqual(['rasterise', 'expand', 'colours', 'borders'])
    })
  })

  describe('variants', () => {
    it('paints the installed political layer into the next bake', async () => {
      const compute = createInlineMapCompute()
      await compute.setSources(sources(ALL_LAND))
      const bare = await compute.bakeTerrain(OPTIONS)
      await compute.computePolitical(REQUEST)
      const tinted = await compute.bakeTerrain(OPTIONS)
      expect(Array.from(tinted.rgba)).not.toEqual(Array.from(bare.rgba))
    })

    it('takes the political layer back off on clearPolitical', async () => {
      const compute = createInlineMapCompute()
      await compute.setSources(sources(ALL_LAND))
      const bare = await compute.bakeTerrain(OPTIONS)
      await compute.computePolitical(REQUEST)
      await compute.clearPolitical()
      const again = await compute.bakeTerrain(OPTIONS)
      expect(Array.from(again.rgba)).toEqual(Array.from(bare.rgba))
    })

    it('scales the grid by rasterScale', async () => {
      const compute = createInlineMapCompute()
      await compute.setSources(sources(ALL_LAND))
      const result = await compute.computePolitical({ ...REQUEST, rasterScale: 2 })
      expect(result.width).toBe(16)
      expect(result.height).toBe(16)
    })

    it('scales snapToCoast with the grid, so its reach in kilometres holds', async () => {
      const expanded = async (rasterScale: number): Promise<number> => {
        const compute = createInlineMapCompute()
        await compute.setSources(sources(ALL_LAND))
        const result = await compute.computePolitical({ ...REQUEST, rasterScale, snapToCoast: 1 })
        const claimed = result.cells.reduce((n, cell) => (cell >= 0 ? n + 1 : n), 0)
        return claimed / result.cells.length
      }
      // One DEM cell of reach covers the same fraction of the map whichever grid it is walked on.
      expect(await expanded(2)).toBeCloseTo(await expanded(1), 1)
    })

    it('offers the suzerain’s name to the pinning rule when colouring by suzerain', async () => {
      // Note what this does *not* claim: two vassals of one crown only share a colour because the crown
      // is pinned. The automatic palette colours by index against adjacency and knows nothing of names,
      // so under an unpinned suzerain the two would still be told apart.
      const seen: (string | null)[] = []
      const compute = createInlineMapCompute({
        pinnedFor: (name) => {
          seen.push(name)
          return name === 'Empire' ? { r: 7, g: 7, b: 7 } : null
        },
      })
      await compute.setSources(sources(ALL_LAND))
      const vassals: Region[] = [
        { ...box('Alpha', 0, 0, 0.45, 1), subjectTo: 'Empire' },
        { ...box('Beta', 0.55, 0, 1, 1), subjectTo: 'Empire' },
      ]
      const result = await compute.computePolitical({
        ...REQUEST,
        regions: vassals,
        colorBySuzerain: true,
      })
      expect(seen).toEqual(['Empire', 'Empire'])
      expect(result.tints).toEqual([
        { r: 7, g: 7, b: 7 },
        { r: 7, g: 7, b: 7 },
      ])
    })

    it('offers the polity’s own name when not colouring by suzerain', async () => {
      const seen: (string | null)[] = []
      const compute = createInlineMapCompute({
        pinnedFor: (name) => {
          seen.push(name)
          return null
        },
      })
      await compute.setSources(sources(ALL_LAND))
      await compute.computePolitical({
        ...REQUEST,
        regions: [
          { ...box('Alpha', 0, 0, 0.45, 1), subjectTo: 'Empire' },
          { ...box('Beta', 0.55, 0, 1, 1), subjectTo: 'Empire' },
        ],
      })
      expect(seen).toEqual(['Alpha', 'Beta'])
    })

    it('takes the pinned colouring from its injected rule', async () => {
      const compute = createInlineMapCompute({ pinnedFor: () => ({ r: 1, g: 2, b: 3 }) })
      await compute.setSources(sources(ALL_LAND))
      const result = await compute.computePolitical(REQUEST)
      expect(result.tints).toEqual([
        { r: 1, g: 2, b: 3 },
        { r: 1, g: 2, b: 3 },
      ])
    })

    it('yields to the host between phases when one is injected', async () => {
      const yieldControl = vi.fn(() => Promise.resolve())
      const compute = createInlineMapCompute({ yieldControl })
      await compute.setSources(sources(ALL_LAND))
      await compute.computePolitical(REQUEST)
      expect(yieldControl).toHaveBeenCalledTimes(4)
    })
  })

  describe('managed errors', () => {
    it('falls back to thresholding elevation when no mask is installed', async () => {
      const compute = createInlineMapCompute()
      await compute.setSources(sources())
      const bake = await compute.bakeTerrain(OPTIONS)
      expect(bake.rgba.length).toBe(8 * 8 * 4)
    })

    it('draws no frontier line without a mask — it cannot tell unclaimed land from open sea', async () => {
      const compute = createInlineMapCompute()
      await compute.setSources(sources())
      const result = await compute.computePolitical(REQUEST)
      expect(result.borders.frontier).toEqual([])
    })

    it('keeps the mask when the heightmap is installed again', async () => {
      const compute = createInlineMapCompute()
      await compute.setSources(sources(ALL_LAND))
      const withMask = await compute.computePolitical(REQUEST)
      await compute.setSources(sources(ALL_LAND))
      const again = await compute.computePolitical(REQUEST)
      expect(again.borders.frontier.length).toBe(withMask.borders.frontier.length)
    })
  })

  describe('unmanaged errors', () => {
    it('states the missing heightmap instead of returning an empty map', async () => {
      const compute = createInlineMapCompute()
      await expect(compute.computePolitical(REQUEST)).rejects.toThrow(/heightmap/)
      await expect(compute.bakeTerrain(OPTIONS)).rejects.toThrow(/heightmap/)
    })

    it('surfaces a yield that rejects rather than swallowing it', async () => {
      const compute = createInlineMapCompute({
        yieldControl: () => Promise.reject(new Error('teardown')),
      })
      await compute.setSources(sources(ALL_LAND))
      await expect(compute.computePolitical(REQUEST)).rejects.toThrow('teardown')
    })
  })

  describe('edge cases', () => {
    it('handles a request with no polities at all', async () => {
      const compute = createInlineMapCompute()
      await compute.setSources(sources(ALL_LAND))
      const result = await compute.computePolitical({ ...REQUEST, regions: [] })
      expect(result.tints).toEqual([])
      expect(result.borders.between).toEqual([])
      expect(result.cells.every((cell) => cell === -1)).toBe(true)
    })

    it('clamps a rasterScale below 1 to the DEM’s own grid', async () => {
      const compute = createInlineMapCompute()
      await compute.setSources(sources(ALL_LAND))
      const result = await compute.computePolitical({ ...REQUEST, rasterScale: 0 })
      expect(result.width).toBe(8)
    })

    it('drops everything it holds on dispose', async () => {
      const compute = createInlineMapCompute()
      await compute.setSources(sources(ALL_LAND))
      compute.dispose()
      await expect(compute.bakeTerrain(OPTIONS)).rejects.toThrow(/heightmap/)
    })
  })
})

describe('rasterFromResult', () => {
  describe('happy path', () => {
    it('answers indexAt the same way the compute’s own raster did', async () => {
      const compute = createInlineMapCompute()
      await compute.setSources(sources(ALL_LAND))
      const result = await compute.computePolitical(REQUEST)
      const raster = rasterFromResult(result)
      expect(raster.indexAt(0.1, 0.5)).toBe(result.cells[4 * 8 + 1])
      expect(raster.indexAt(0.9, 0.5)).toBe(result.cells[4 * 8 + 7])
    })
  })

  // L2/L3/L4: N/A — a two-line rebuild over `createRegionRaster`, whose own branches are covered next
  // door in `regionRaster.test.ts`.

  describe('edge cases', () => {
    it('handles an empty grid', () => {
      const raster = rasterFromResult({
        width: 0,
        height: 0,
        cells: new Int16Array(0),
        tints: [],
        borders: { between: [], frontier: [] },
      })
      expect(raster.indexAt(0.5, 0.5)).toBe(-1)
    })
  })
})
