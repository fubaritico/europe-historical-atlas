// @vitest-environment jsdom
import { DataTexture, Scene } from 'three'
import { describe, expect, it } from 'vitest'

import { createHeightmap } from '@europe-historical-atlas/core/data/heightmap'
import { createElevationLandMask } from '@europe-historical-atlas/core/data/landMask'
import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'
import { projectRegions } from '@europe-historical-atlas/core/data/regionSource'
import { toRegionPayload } from '@europe-historical-atlas/core/data/toRegionPayload'
import { assembleAuthoredYear } from '@europe-historical-atlas/core/data/yearConsistency'
import {
  parseYearBorders,
  parseYearPolities,
  parseYearRegistry,
} from '@europe-historical-atlas/core/data/yearSource'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { tribeIds } from '@europe-historical-atlas/core/editor/tribes'
import { saveYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import BORDERS from '../../public/years/1100/borders.json?raw'
import POLITIES from '../../public/years/1100/polities.json?raw'
import REGISTRY from '../../public/years/1100/registry.json?raw'
import MANIFEST from '../../public/years/index.json?raw'
import { createMapLayers } from '../scene/layers/mapLayers'
import { TRIBE_RENDER_ORDER } from '../scene/political/tribes/tribeLayer'
import { createMapSources, refreshReliefSource } from '../sources/mapSources'
import { createDevState } from '../tunables/devState'

import { settleYearBorders } from './yearBorders'

import type { HeightmapMeta } from '@europe-historical-atlas/core/data/heightmap'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { AuthoredYear } from '@europe-historical-atlas/core/data/yearFormat'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/**
 * An authored year with tribes, settled and drawn through the path the application takes —
 * `settleYearBorders`, then the border and fill layers — so a reader of a field the year no longer carries
 * fails here, not on the dev's screen (2026-10-18: `outlines is not iterable`, the border layer still asking
 * for the tribes' dashed outlines after they had gone).
 */

const PALETTE = AUTOMATIC_PALETTE as unknown as [string, ...string[]]

/** The relief's cells across — half the DEM's 1280. */
const RELIEF_CELLS = 640

/**
 * A flat dry relief over a frame, at half the DEM's resolution: the year's fills are cut against it, and
 * `fillTriangles` slows sharply on a coarse grid — 1100 cuts in ~0.45 s at 640 cells across, in minutes at 32,
 * where a cell holds hundreds of edges (measured 2026-10-18).
 * @param bbox - the frame
 * @returns the relief's metadata and grid
 */
function reliefOver(bbox: GeoBounds): ReturnType<typeof createHeightmap> {
  const meta: HeightmapMeta = {
    width: RELIEF_CELLS + 1,
    height: RELIEF_CELLS + 1,
    zoom: 5,
    bbox,
    min: 0,
    max: 500,
    encoding: 'int16-le-metres',
  }
  return createHeightmap(meta, new Int16Array((RELIEF_CELLS + 1) ** 2).fill(200))
}

/**
 * Settle a year and build its borders and fills, as the pipeline and the layers do.
 * @param loaded - the year, as the authored source hands it over
 * @returns the scene and the sources it was drawn from
 */
function drawYear(loaded: RegionSet): {
  scene: Scene
  sources: ReturnType<typeof createMapSources>
} {
  const bbox = loaded.authored?.bbox
  if (!bbox) throw new Error('fixture: not an authored year')
  const scene = new Scene()
  const dev = createDevState()
  dev.relief.segments = RELIEF_CELLS
  const sources = createMapSources()
  sources.heightmap = reliefOver(bbox)
  sources.landMask = createElevationLandMask(sources.heightmap, 0)
  refreshReliefSource(sources, dev.relief, dev.texture.seaLevel)
  sources.regionSet = loaded
  const tints = loaded.regions.map(() => ({ r: 120, g: 90, b: 60 }))
  settleYearBorders(sources, loaded, { borders: { between: [], frontier: [] }, tints }, PALETTE)
  const layers = createMapLayers({ scene, dev, sources })
  layers.rebuildRelief()
  layers.setTexture(new DataTexture(new Uint8Array(16), 2, 2))
  layers.rebuildBorders()
  layers.rebuildFills()
  return { scene, sources }
}

/**
 * An authored year as the authored source hands it over: regions projected, the year beside them.
 * @param authored - the year's three files, assembled
 * @param bbox - the manifest's frame
 * @returns the region set
 */
function loadedYear(authored: AuthoredYear, bbox: GeoBounds): RegionSet {
  return { ...projectRegions(toRegionPayload(authored, bbox)), authored: { year: authored, bbox } }
}

describe('an authored year with tribes, through the application’s path', () => {
  it('settles and draws a year whose polity is a tribe, its ground faded rather than stroked', () => {
    const doc = sharedBorderDocument()
    const hre = doc.polities.find((polity) => polity.id === 'hre')
    if (hre) hre.rank = 'tribe'
    const bbox = { west: -10, south: 35, east: 10, north: 60 }
    const year = { year: 1100, ...saveYearDocument(doc) }

    const { scene, sources } = drawYear(loadedYear(year, bbox))

    expect(sources.tribes).toHaveLength(1)
    expect(scene.children.some((child) => child.renderOrder === TRIBE_RENDER_ORDER)).toBe(true)
  })

  // The published year, imported as text and never written: its tribes, and its 137 polities' borders,
  // through the same path. Slow-ish (the borders of the whole year are derived), hence its own budget.
  it('settles and draws the published 1100, one faded patch per tribe claim', () => {
    const manifest = JSON.parse(MANIFEST) as { bbox: GeoBounds }
    const authored = assembleAuthoredYear(
      {
        registry: parseYearRegistry(JSON.parse(REGISTRY), '1100/registry.json'),
        polities: parseYearPolities(JSON.parse(POLITIES), '1100/polities.json'),
        borders: parseYearBorders(JSON.parse(BORDERS), '1100/borders.json'),
      },
      '1100'
    )
    const loaded = loadedYear(authored, manifest.bbox)
    const tribes = tribeIds(authored.registry.polities)

    const { scene, sources } = drawYear(loaded)

    const expected = loaded.regions.filter(
      (region) => region.polityId !== undefined && tribes.has(region.polityId)
    ).length
    expect(sources.tribes).toHaveLength(expected)
    expect(scene.children.some((child) => child.renderOrder === TRIBE_RENDER_ORDER)).toBe(
      expected > 0
    )
  }, 30_000)
})
