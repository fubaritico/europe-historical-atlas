// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createHeightmap } from '@europe-atlas/core/data/heightmap'
import { createElevationLandMask } from '@europe-atlas/core/data/landMask'

import { createDevState } from './devState'
import { createMapPipeline } from './mapPipeline'
import { createMapSources } from './mapSources'

import type { DevState } from './devState'
import type { MapLayers } from './mapLayers'
import type { MapAssetSources, MapPipelineDeps } from './mapPipeline'
import type { MapUi } from './mapUi'
import type { HeightmapMeta } from '@europe-atlas/core/data/heightmap'
import type { RegionSet } from '@europe-atlas/core/data/regionSource'
import type { Mock } from 'vitest'

const META: HeightmapMeta = {
  width: 4,
  height: 4,
  zoom: 5,
  bbox: { west: -10, south: 35, east: 10, north: 60 },
  min: 0,
  max: 1000,
  encoding: 'int16-le-metres',
}

/** A tiny relief: half sea, half land, so the mask has something to say. */
const DEM = createHeightmap(
  META,
  Int16Array.from([-9, -9, -9, -9, -9, 8, 8, -9, -9, 8, 8, -9, 0, 0, 0, 0])
)
const MASK = createElevationLandMask(DEM, 0)

/** One polity covering the whole frame. */
const YEAR: RegionSet = {
  year: 1500,
  regions: [
    {
      name: 'Somewhere',
      subjectTo: null,
      rings: [
        [
          { u: 0, v: 0 },
          { u: 1, v: 0 },
          { u: 1, v: 1 },
          { u: 0, v: 1 },
        ],
      ],
    },
  ],
} as unknown as RegionSet

/** Read a fake's call record. The fakes are typed as the contracts they stand in for, not as mocks. */
const asMock = (fn: unknown): Mock => fn as Mock

/** Every layer call, recorded. */
function fakeLayers(): MapLayers {
  const names = [
    'rebuildRelief',
    'setTexture',
    'rebuildCoastline',
    'rebuildRhumb',
    'rebuildRivers',
    'rebuildBorders',
    'rebuildRose',
    'rebuildFrame',
    'setWireframe',
    'setCoastColor',
    'setRiverColor',
    'setRhumbColor',
    'setRoseOpacity',
    'setResolution',
    'frame',
    'dispose',
  ]
  return Object.fromEntries(names.map((n) => [n, vi.fn()])) as unknown as MapLayers
}

/** An interface that records what it was told, without any DOM. */
function fakeUi(): MapUi {
  return {
    progress: {
      element: document.createElement('div'),
      begin: vi.fn(),
      report: vi.fn(),
      end: vi.fn(),
      dispose: vi.fn(),
    },
    dismissSplash: vi.fn(),
    reportAssetFailure: vi.fn(),
    dispose: vi.fn(),
  }
}

/** Ports that answer instantly, overridable one at a time. */
function fakeAssets(over: Partial<MapAssetSources> = {}): Partial<MapAssetSources> {
  return {
    heightmap: { load: () => Promise.resolve(DEM) },
    landMask: { load: () => Promise.resolve(MASK) },
    rivers: { load: () => Promise.resolve([]) },
    regions: { load: () => Promise.resolve(YEAR) },
    ...over,
  }
}

function build(over: Partial<MapPipelineDeps> = {}): {
  deps: MapPipelineDeps
  dev: DevState
  pipeline: ReturnType<typeof createMapPipeline>
} {
  const dev = createDevState()
  // The smallest raster the compute will accept, so a test costs microseconds rather than a second.
  dev.political.rasterScale = 1
  dev.political.snapToCoast = 0
  const deps = {
    dev,
    sources: createMapSources(),
    layers: fakeLayers(),
    ui: fakeUi(),
    // No worker in a test environment: the pipeline falls back to the inline compute, which is the
    // same implementation the worker runs, so this drives the real thing rather than a stand-in.
    spawn: (): never => {
      throw new Error('no worker here')
    },
    isDisposed: () => false,
    assets: fakeAssets(),
    ...over,
  } as unknown as MapPipelineDeps
  return { deps, dev, pipeline: createMapPipeline(deps) }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createMapPipeline', () => {
  describe('happy path', () => {
    it('brings the terrain up before the countries', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      // Stage one is the terrain; stage two paints the countries in. The relief must never be built
      // before its texture, or it shows as bare material colour — the flash this sequencing removes.
      const texture = asMock(deps.layers.setTexture).mock.invocationCallOrder[0] ?? Infinity
      const relief = asMock(deps.layers.rebuildRelief).mock.invocationCallOrder[0] ?? 0
      expect(texture).toBeLessThan(relief)
    })

    it('settles the loaded sources', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      expect(deps.sources.heightmap).toBe(DEM)
      expect(deps.sources.landMask).toBe(MASK)
      expect(deps.sources.reliefSource).not.toBeNull()
    })

    it('takes the splash down once there is a map to look at', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      expect(asMock(deps.ui.dismissSplash)).toHaveBeenCalledTimes(1)
    })
  })

  describe('variants', () => {
    it('draws the borders of the year it computed', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      expect(deps.sources.regionSet).toBe(YEAR)
      expect(deps.sources.derivedBorders).not.toBeNull()
      expect(asMock(deps.layers.rebuildBorders)).toHaveBeenCalled()
    })

    it('bakes twice, which is what two deliberate stages cost', async () => {
      // Stated rather than hidden: the terrain is baked, then baked again with the political tint
      // composited in. The waste that was removed is the third bake, not this one.
      const { deps, pipeline } = build()
      await pipeline.start()
      expect(asMock(deps.layers.setTexture)).toHaveBeenCalledTimes(2)
    })

    it('draws the rivers when they land', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      expect(asMock(deps.layers.rebuildRivers)).toHaveBeenCalled()
    })

    it('re-traces the borders without refetching the year', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      const before = deps.sources.derivedBorders
      await pipeline.rebuildBorderGeometry()
      expect(deps.sources.derivedBorders).not.toBe(before)
      expect(asMock(deps.layers.rebuildBorders)).toHaveBeenCalledTimes(2)
    })

    it('rounds the year to the century the dataset actually provides', async () => {
      const load = vi.fn(() => Promise.resolve(YEAR))
      const { dev, pipeline } = build({ assets: fakeAssets({ regions: { load } }) })
      dev.political.year = 1547
      await pipeline.rebuildPolitical()
      expect(load).not.toHaveBeenCalled() // no elevation yet
      await pipeline.start()
      expect(load).toHaveBeenCalledWith(1500)
    })
  })

  describe('managed errors', () => {
    it('carries on without a mask, which is a degraded map rather than no map', async () => {
      const { deps, pipeline } = build({
        assets: fakeAssets({ landMask: { load: () => Promise.reject(new Error('404')) } }),
      })
      await pipeline.start()
      expect(asMock(deps.ui.reportAssetFailure)).toHaveBeenCalledWith('landMask', expect.anything())
      expect(deps.sources.landMask).toBeNull()
      expect(asMock(deps.layers.rebuildRelief)).toHaveBeenCalled()
    })

    it('refuses a mask cropped to a different part of the world', async () => {
      // Internally valid and completely wrong: every coastline would land somewhere it is not, with
      // nothing anywhere to say so.
      const elsewhere = createElevationLandMask(
        createHeightmap(
          { ...META, bbox: { west: 40, south: 0, east: 60, north: 20 } },
          new Int16Array(16)
        ),
        0
      )
      const { deps, pipeline } = build({
        assets: fakeAssets({ landMask: { load: () => Promise.resolve(elsewhere) } }),
      })
      await pipeline.start()
      expect(deps.sources.landMask).toBeNull()
      expect(asMock(deps.ui.reportAssetFailure)).toHaveBeenCalledWith('landMask', expect.anything())
    })

    it('tells the reader when a year cannot be fetched, and still ends the bar', async () => {
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.reject(new Error('404')) } }),
      })
      await pipeline.start()
      expect(asMock(deps.ui.reportAssetFailure)).toHaveBeenCalledWith('regions', expect.anything())
      expect(asMock(deps.ui.progress.end)).toHaveBeenCalled()
    })

    it('reports a missing relief as the blocking failure it is', async () => {
      const { deps, pipeline } = build({
        assets: fakeAssets({ heightmap: { load: () => Promise.reject(new Error('404')) } }),
      })
      await pipeline.start()
      expect(asMock(deps.ui.reportAssetFailure)).toHaveBeenCalledWith(
        'heightmap',
        expect.anything()
      )
      expect(asMock(deps.layers.rebuildRelief)).not.toHaveBeenCalled()
    })

    it('says so when the rivers fail, without touching anything else', async () => {
      const { deps, pipeline } = build({
        assets: fakeAssets({ rivers: { load: () => Promise.reject(new Error('404')) } }),
      })
      await pipeline.start()
      await Promise.resolve()
      expect(asMock(deps.ui.reportAssetFailure)).toHaveBeenCalledWith('rivers', expect.anything())
      expect(deps.sources.heightmap).toBe(DEM)
    })
  })

  describe('unmanaged errors', () => {
    it('writes nothing back once the app has been torn down mid-load', async () => {
      let gone = false
      const { deps, pipeline } = build({
        isDisposed: () => gone,
        assets: fakeAssets({
          heightmap: {
            load: () => {
              gone = true
              return Promise.resolve(DEM)
            },
          },
        }),
      })
      await pipeline.start()
      expect(asMock(deps.layers.rebuildRelief)).not.toHaveBeenCalled()
      expect(asMock(deps.layers.setTexture)).not.toHaveBeenCalled()
    })

    it('lets only the newest year settle the map', async () => {
      // Two rebuilds overlapping: the older one must not paint the map back to where the reader has
      // already left. Checked before every side effect, not only before the state write.
      const slow: RegionSet = { ...YEAR }
      const { deps, dev, pipeline } = build({
        assets: fakeAssets({
          regions: {
            load: (year: number) =>
              year === 1500
                ? new Promise((resolve) =>
                    setTimeout(() => {
                      resolve(slow)
                    }, 20)
                  )
                : Promise.resolve(YEAR),
          },
        }),
      })
      deps.sources.heightmap = DEM
      deps.sources.landMask = MASK
      dev.political.year = 1500
      const stale = pipeline.rebuildPolitical()
      dev.political.year = 1600
      await pipeline.rebuildPolitical()
      const afterNewest = asMock(deps.layers.rebuildBorders).mock.calls.length
      await stale
      expect(asMock(deps.layers.rebuildBorders).mock.calls.length).toBe(afterNewest)
    })
  })

  describe('edge cases', () => {
    it('does nothing at all before the elevation has landed', async () => {
      const { deps, pipeline } = build()
      await pipeline.rebuildPolitical()
      await pipeline.rebuildTexture()
      expect(asMock(deps.layers.setTexture)).not.toHaveBeenCalled()
      expect(asMock(deps.ui.progress.begin)).not.toHaveBeenCalled()
    })

    it('traces no borders before a year has been computed', async () => {
      const { deps, pipeline } = build()
      await pipeline.rebuildBorderGeometry()
      expect(asMock(deps.layers.rebuildBorders)).not.toHaveBeenCalled()
    })

    it('releases the compute on teardown', () => {
      const { pipeline } = build()
      expect(() => {
        pipeline.dispose()
      }).not.toThrow()
    })
  })
})
