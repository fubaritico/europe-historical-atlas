// @vitest-environment jsdom
import { Scene } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createHeightmap } from './data/heightmap'
import { createElevationLandMask } from './data/landMask'
import { createDevState } from './devState'
import { createMapLayers } from './mapLayers'
import { createMapSources, refreshReliefSource } from './mapSources'

import type { HeightmapMeta } from './data/heightmap'
import type { RegionBorders } from './data/regionRaster'
import type { RegionSet } from './data/regionSource'
import type { MapSources } from './mapSources'

const META: HeightmapMeta = {
  width: 8,
  height: 8,
  zoom: 5,
  bbox: { west: -10, south: 35, east: 10, north: 60 },
  min: 0,
  max: 1000,
  encoding: 'int16-le-metres',
}

/** A relief with a patch of land in the middle, so the coastline has a contour to trace. */
const DEM = createHeightmap(
  META,
  Int16Array.from({ length: 64 }, (_, i) => {
    const x = i % 8
    const y = (i - x) / 8
    return x > 1 && x < 6 && y > 1 && y < 6 ? 400 : -20
  })
)

const BORDERS: RegionBorders = {
  between: [
    {
      pair: [0, 1],
      lines: [
        [
          { u: 0.2, v: 0.5 },
          { u: 0.8, v: 0.5 },
        ],
      ],
    },
  ],
  frontier: [],
}

const REGIONS = {
  year: 1500,
  regions: [
    { name: 'A', subjectTo: null },
    { name: 'B', subjectTo: null },
  ],
} as unknown as RegionSet

/** A scene with layers over a fully loaded set of sources. */
function build(loaded = true): {
  scene: Scene
  sources: MapSources
  dev: ReturnType<typeof createDevState>
  layers: ReturnType<typeof createMapLayers>
} {
  const scene = new Scene()
  const dev = createDevState()
  const sources = createMapSources()
  if (loaded) {
    sources.heightmap = DEM
    sources.landMask = createElevationLandMask(DEM, 0)
    sources.regionSet = REGIONS
    sources.derivedBorders = BORDERS
    refreshReliefSource(sources, 0)
  }
  return { scene, sources, dev, layers: createMapLayers({ scene, dev, sources }) }
}

/** Read the geometry of whatever is at a scene slot — a `Mesh` or a line layer's object. */
const geometryOf = (object: unknown): { dispose: () => void } =>
  (object as { geometry: { dispose: () => void } }).geometry

/** Read the material of whatever is at a scene slot. */
const materialOf = (object: unknown): { wireframe: boolean } =>
  (object as { material: { wireframe: boolean } }).material

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createMapLayers', () => {
  describe('happy path', () => {
    it('draws nothing until something is rebuilt', () => {
      expect(build().scene.children).toHaveLength(0)
    })

    it('adds the relief to the scene', () => {
      const { scene, layers } = build()
      layers.rebuildRelief()
      expect(scene.children).toHaveLength(1)
    })

    it('adds each overlay exactly once', () => {
      const { scene, layers } = build()
      layers.rebuildRelief()
      layers.rebuildCoastline()
      layers.rebuildRhumb()
      layers.rebuildBorders()
      expect(scene.children).toHaveLength(4)
    })
  })

  describe('variants', () => {
    it('replaces a layer rather than stacking a second one', () => {
      const { scene, layers } = build()
      layers.rebuildCoastline()
      const first = scene.children[0]
      layers.rebuildCoastline()
      expect(scene.children).toHaveLength(1)
      expect(scene.children[0]).not.toBe(first)
    })

    it('frees the GPU resources of the layer it replaced', () => {
      const { scene, layers } = build()
      layers.rebuildCoastline()
      const freed = vi.spyOn(geometryOf(scene.children[0]), 'dispose')
      layers.rebuildCoastline()
      expect(freed).toHaveBeenCalled()
    })

    it('scales the relief by the exaggeration, eased toward zoomed-in', () => {
      const { scene, dev, layers } = build()
      dev.relief.exaggeration = 2
      dev.relief.exaggZoomIn = 0.5
      layers.rebuildRelief()
      layers.frame(0)
      const out = scene.children[0]?.scale.y ?? 0
      layers.frame(1)
      const inn = scene.children[0]?.scale.y ?? 0
      expect(out).toBeCloseTo(2)
      expect(inn).toBeCloseTo(1)
    })

    it('tracks the relief scale on everything draped over it', () => {
      // A draped layer is built against an unexaggerated surface; miss this and it floats by the
      // exaggeration ratio — invisible on a plain, glaring along a crest.
      const { scene, dev, layers } = build()
      dev.relief.exaggeration = 3
      dev.relief.exaggZoomIn = 1
      layers.rebuildRelief()
      layers.rebuildBorders()
      layers.frame(0)
      const relief = scene.children[0]?.scale.y ?? 0
      const borders = scene.children[1]?.scale.y ?? 0
      expect(borders).toBeCloseTo(relief)
    })

    it('repaints the coastline without rebuilding it', () => {
      const { scene, layers } = build()
      layers.rebuildCoastline()
      const before = scene.children[0]
      layers.setCoastColor('#123456')
      expect(scene.children[0]).toBe(before)
    })

    it('flips the relief wireframe on the live material', () => {
      const { scene, layers } = build()
      layers.rebuildRelief()
      layers.setWireframe(true)
      expect(materialOf(scene.children[0]).wireframe).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('builds nothing before the elevation has loaded', () => {
      const { scene, layers } = build(false)
      layers.rebuildRelief()
      layers.rebuildCoastline()
      layers.rebuildRhumb()
      layers.rebuildRivers()
      expect(scene.children).toHaveLength(0)
    })

    it('still traces a coastline without the mask, falling back on elevation', () => {
      // Visibly wrong in the Dutch polders, but a degraded map beats a blank canvas.
      const { scene, sources, layers } = build()
      sources.landMask = null
      layers.rebuildCoastline()
      expect(scene.children).toHaveLength(1)
    })

    it('draws no borders when the reader has turned them off', () => {
      const { scene, dev, layers } = build()
      dev.political.showBorders = false
      layers.rebuildBorders()
      expect(scene.children).toHaveLength(0)
    })

    it('draws no borders before a year has been derived', () => {
      const { scene, sources, layers } = build()
      sources.derivedBorders = null
      layers.rebuildBorders()
      expect(scene.children).toHaveLength(0)
    })
  })

  describe('unmanaged errors', () => {
    it('takes a border pair naming polities it has never heard of', () => {
      // The raster indexes regions; a stale region set must give a plain border, not an exception.
      const { scene, sources, layers } = build()
      sources.regionSet = null
      layers.rebuildBorders()
      expect(scene.children).toHaveLength(1)
    })

    it('frames a map with nothing on it', () => {
      const { layers } = build(false)
      expect(() => {
        layers.frame(0.5)
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('empties the scene on teardown', () => {
      const { scene, layers } = build()
      layers.rebuildRelief()
      layers.rebuildCoastline()
      layers.rebuildRhumb()
      layers.rebuildBorders()
      layers.dispose()
      expect(scene.children).toHaveLength(0)
    })

    it('frees the relief geometry on teardown, not just unparents it', () => {
      const { scene, layers } = build()
      layers.rebuildRelief()
      const freed = vi.spyOn(geometryOf(scene.children[0]), 'dispose')
      layers.dispose()
      expect(freed).toHaveBeenCalled()
    })

    it('takes a resize with no fat-line layer built yet', () => {
      const { layers } = build()
      expect(() => {
        layers.setResolution(800, 600)
      }).not.toThrow()
    })
  })
})
