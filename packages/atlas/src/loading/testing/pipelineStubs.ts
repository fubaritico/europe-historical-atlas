/**
 * The stand-ins a pipeline is tested with — its layers recorded, its interface without a DOM, its ports answering at
 * once — shared by the pipeline's suites (`mapPipeline.test.ts`, `stages/prepareAside.test.ts`) so none keeps a copy.
 */

import { vi } from 'vitest'

import { CONTENT_FORMAT_VERSION } from '@europe-historical-atlas/core/data/contentFormat'
import { createHeightmap } from '@europe-historical-atlas/core/data/heightmap'
import { createElevationLandMask } from '@europe-historical-atlas/core/data/landMask'
import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { ATLAS_MESSAGES } from '../../i18n'
import { meshVertexGrid } from '../../scene/relief/reliefMesh'
import { createMapSources } from '../../sources/mapSources'
import { createDevState } from '../../tunables/devState'
import { createMapPipeline } from '../mapPipeline'

import { META, YEAR } from './yearFixtures'

import type { MapUi } from '../../app/mapUi'
import type { MapLayers } from '../../scene/layers/mapLayers'
import type { DevState } from '../../tunables/devState'
import type { MapAssetSources } from '../assets'
import type { MapPipelineDeps } from '../pipelineContext'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { Mock } from 'vitest'

/** A tiny relief: half sea, half land, so the mask has something to say. */
export const DEM = createHeightmap(
  META,
  Int16Array.from([-9, -9, -9, -9, -9, 8, 8, -9, -9, 8, 8, -9, 0, 0, 0, 0])
)
export const MASK = createElevationLandMask(DEM, 0)

/** The relief the stand-in layers read their heights from — one object, so a key built on it can be compared. */
export const RELIEF = { name: 'test relief' }

/**
 * Read a fake's call record. The fakes are typed as the contracts they stand in for, not as mocks.
 * @param fn - a fake
 * @returns it as the mock it is
 */
export const asMock = (fn: unknown): Mock => fn as Mock

/**
 * Every layer call, recorded.
 * @returns the layers, each a mock
 */
export function fakeLayers(): MapLayers {
  const names = [
    'rebuildRelief',
    'setTexture',
    'rebuildCoastline',
    'rebuildRhumb',
    'rebuildRivers',
    'rebuildBorders',
    'rebuildFills',
    'rebuildNames',
    'rebuildEvents',
    'setReveal',
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
    'shelveYear',
    'restoreYear',
    'holdsYear',
    'keepYears',
    'discardYear',
    'uploadYear',
    'primeFillArrays',
    'reliefHeights',
    'primeTribeCut',
  ]
  return Object.fromEntries(names.map((n) => [n, vi.fn()])) as unknown as MapLayers
}

/**
 * Layers that set years aside as the real shelf does, by year alone: a year shelved is held, restoring it brings it back.
 * @param layers - the recorded layers
 * @param sources - the map's sources, whose year is emptied on shelving and given back on restoring
 * @returns the layers
 */
export function shelvingLayers(layers: MapLayers, sources: MapPipelineDeps['sources']): MapLayers {
  const aside = new Map<number, RegionSet | null>()
  asMock(layers.shelveYear).mockImplementation((year: number) => {
    aside.set(year, sources.regionSet)
    sources.regionSet = null
  })
  asMock(layers.holdsYear).mockImplementation((year: number) => aside.has(year))
  asMock(layers.restoreYear).mockImplementation((year: number) => {
    if (!aside.has(year)) return false
    sources.regionSet = aside.get(year) ?? null
    aside.delete(year)
    return true
  })
  return layers
}

/**
 * An interface that records what it was told, without any DOM.
 * @returns the interface
 */
export function fakeUi(): MapUi {
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

/**
 * When a mock was first called, against every other mock of the test.
 * @param fn - the mock
 * @returns its first call's order
 */
export function firstCall(fn: unknown): number {
  return Math.min(...asMock(fn).mock.invocationCallOrder)
}

/**
 * A promise the test resolves when it chooses — to force an order of arrival.
 * @returns the promise and its resolver
 */
export function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

/** The atlas in French, as a French browser gets it. */
export const FR = createTranslator(ATLAS_MESSAGES, 'fr')

/**
 * Let every pending microtask run.
 * @returns once they have
 */
export const flush = () => new Promise((settle) => setTimeout(settle, 0))

/**
 * Ports that answer instantly, overridable one at a time.
 * @param over - the ports to replace
 * @returns the ports
 */
export function fakeAssets(over: Partial<MapAssetSources> = {}): Partial<MapAssetSources> {
  return {
    heightmap: { load: () => Promise.resolve(DEM) },
    landMask: { load: () => Promise.resolve(MASK) },
    rivers: { load: () => Promise.resolve({ source: 'test', bbox: META.bbox, rivers: [] }) },
    regions: { load: () => Promise.resolve(YEAR) },
    content: {
      load: () => Promise.resolve({ version: CONTENT_FORMAT_VERSION, events: [], cities: [] }),
    },
    ...over,
  }
}

/**
 * A pipeline over the stand-ins, on the inline compute — the same code the worker runs.
 * @param over - the deps to replace
 * @returns its deps, its tunables and the pipeline
 */
export function build(over: Partial<MapPipelineDeps> = {}): {
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
    translate: FR,
    // No worker in a test environment: the pipeline falls back to the inline compute, which is the
    // same implementation the worker runs, so this drives the real thing rather than a stand-in.
    spawn: (): never => {
      throw new Error('no worker here')
    },
    // The page painted at once: the wait's own frames are core's `afterPaint`'s to test.
    afterPaint: vi.fn(() => Promise.resolve()),
    isDisposed: () => false,
    assets: fakeAssets(),
    ...over,
  } as unknown as MapPipelineDeps
  // The relief's heights, one a node of the grid the year is laid on: flat, as the test relief is small.
  const { segX, segY } = meshVertexGrid(META, dev.relief.segments)
  asMock(deps.layers.reliefHeights).mockImplementation(() => ({
    relief: RELIEF,
    heights: new Float32Array((segX + 1) * (segY + 1)),
  }))
  return { deps, dev, pipeline: createMapPipeline(deps) }
}
