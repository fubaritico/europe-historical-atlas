// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CONTENT_FORMAT_VERSION } from '@europe-historical-atlas/core/data/contentFormat'
import { createHeightmap } from '@europe-historical-atlas/core/data/heightmap'
import { createElevationLandMask } from '@europe-historical-atlas/core/data/landMask'
import * as fillModule from '@europe-historical-atlas/core/pipeline/fillTriangles'
import * as patchModule from '@europe-historical-atlas/core/pipeline/tribePatches'

import { STARTUP_SLICES } from './startupBar'
import { stubNameFace } from './testing/nameFaceStubs'
import {
  DEM,
  FR,
  MASK,
  asMock,
  build,
  deferred,
  fakeAssets,
  firstCall,
  flush,
  shelvingLayers,
} from './testing/pipelineStubs'
import { AUTHORED_YEAR, META, TRIBE_YEAR, YEAR } from './testing/yearFixtures'
import * as yearBordersModule from './yearBorders'

import type { MapLayers } from '../scene/layers/mapLayers'
import type { MeasuredTribes } from '../scene/political/tribes/mapTribeLayer'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { RiverSet } from '@europe-historical-atlas/core/data/riverSource'

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// Stage one bakes the bare terrain; the year's bake is compared with it. Tinted twice, the colour
// would show the grid's staircase under the exact fill.
const pixels = (call: unknown[] | undefined): Uint8Array =>
  (call?.[0] as { image: { data: Uint8Array } }).image.data

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

    // ATLAS-333, the dev, 2026-11-08: the splash stays until the first map is wholly laid.
    it('takes the splash down once, after the year, its names and the events are laid', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      expect(asMock(deps.ui.dismissSplash)).toHaveBeenCalledTimes(1)
      expect(Math.max(...asMock(deps.layers.rebuildEvents).mock.invocationCallOrder)).toBeLessThan(
        firstCall(deps.ui.dismissSplash)
      )
      expect(firstCall(deps.layers.rebuildRelief)).toBeLessThan(firstCall(deps.ui.dismissSplash))
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

    it('stands the events once the countries are drawn, never before', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      await flush()
      const fills = asMock(deps.layers.rebuildFills).mock.invocationCallOrder
      const events = asMock(deps.layers.rebuildEvents).mock.invocationCallOrder
      expect(deps.sources.mapDrawn).toBe(true)
      expect(Math.max(...events)).toBeGreaterThan(Math.max(...fills))
    })

    // ATLAS-333, the dev, 2026-11-08: one bar on the splash, from the first byte to the first map wholly laid.
    it('keeps one bar open from the relief to the events, closed before the splash goes', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      const ended = Math.min(...asMock(deps.ui.progress.end).mock.invocationCallOrder)
      expect(asMock(deps.ui.progress.begin)).toHaveBeenCalledTimes(1)
      expect(asMock(deps.ui.progress.begin)).toHaveBeenCalledWith(FR('phaseTerrain'))
      expect(firstCall(deps.ui.progress.begin)).toBeLessThan(firstCall(deps.layers.setTexture))
      expect(Math.max(...asMock(deps.layers.rebuildEvents).mock.invocationCallOrder)).toBeLessThan(
        ended
      )
      expect(ended).toBeLessThan(firstCall(deps.ui.dismissSplash))
    })

    it('tells every step of an authored year’s opening in turn, the bar never going back', async () => {
      stubNameFace()
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      await pipeline.start()
      const calls = asMock(deps.ui.progress.report).mock.calls as [number, string][]
      const steps = calls.map(([, label]) => label).filter((label, i, all) => label !== all[i - 1])
      expect(steps).toEqual([
        FR('phaseTerrain'),
        FR('phaseBake'),
        FR('phaseRelief'),
        FR('loadingYear', { year: '1100' }),
        FR('phaseCut'),
        FR('phaseBorders'),
        FR('phaseNames'),
        FR('phaseEvents'),
      ])
      const fractions = calls.map(([fraction]) => fraction)
      expect(fractions).toEqual([...fractions].sort((a, b) => a - b))
      expect(fractions.at(-1)).toBe(1)
    })

    it('paints the relief’s step and the borders’ before each holds the page', async () => {
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      await pipeline.start()
      const paints = asMock(deps.afterPaint).mock.invocationCallOrder
      const told = (label: string): number =>
        asMock(deps.ui.progress.report).mock.invocationCallOrder[
          (asMock(deps.ui.progress.report).mock.calls as [number, string][]).findIndex(
            ([, said]) => said === label
          )
        ] ?? Infinity
      const paintedAfter = (order: number): number =>
        paints.find((paint) => paint > order) ?? Infinity
      expect(paintedAfter(told(FR('phaseRelief')))).toBeLessThan(
        firstCall(deps.layers.rebuildRelief)
      )
      expect(paintedAfter(told(FR('phaseBorders')))).toBeLessThan(
        firstCall(deps.layers.rebuildFills)
      )
    })

    it('waits for the events before the splash goes', async () => {
      const content = deferred<{ version: number; events: []; cities: [] }>()
      const { deps, pipeline } = build({
        assets: fakeAssets({ content: { load: () => content.promise } }),
      })
      const started = pipeline.start()
      // Once the bar tells the events, the year and its names are in: only the events are awaited.
      await vi.waitFor(() => {
        expect(asMock(deps.ui.progress.report)).toHaveBeenCalledWith(
          expect.any(Number),
          FR('phaseEvents')
        )
      })
      await flush()
      expect(asMock(deps.ui.dismissSplash)).not.toHaveBeenCalled()
      content.resolve({ version: CONTENT_FORMAT_VERSION, events: [], cities: [] })
      await started
      expect(asMock(deps.ui.dismissSplash)).toHaveBeenCalledTimes(1)
    })

    it('places the year’s names before the splash goes', async () => {
      stubNameFace()
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      await pipeline.start()
      // The names laid on the map: their layer rebuilt once taken off, once placed — both before the splash goes.
      const names = asMock(deps.layers.rebuildNames).mock.invocationCallOrder
      expect([deps.sources.yearNames === null, names.length]).toEqual([false, 2])
      expect(Math.max(...names)).toBeLessThan(firstCall(deps.ui.dismissSplash))
    })

    it('pins the events of the year drawn once a change of year has landed', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      asMock(deps.layers.rebuildEvents).mockClear()
      deps.dev.political.year = 1200
      await pipeline.rebuildPolitical()
      expect([deps.sources.askedYear, asMock(deps.layers.rebuildEvents).mock.calls.length]).toEqual(
        [1200, 1]
      )
    })

    it('draws a year changed later under its own bar, the splash long gone and not brought back', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      await pipeline.rebuildPolitical()
      expect(asMock(deps.ui.progress.begin)).toHaveBeenLastCalledWith(
        FR('loadingYear', { year: '1100' })
      )
      expect(asMock(deps.ui.dismissSplash)).toHaveBeenCalledTimes(1)
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

    it('draws an authored year’s borders from its anchors, with their patterns', async () => {
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      await pipeline.start()
      expect(deps.sources.derivedBorders?.between.map((group) => group.pair)).toEqual([[0, 0]])
      expect(deps.sources.borderPatterns?.get('0:0')).toBe('solid')
    })

    it('bakes an authored year bare when the fills carry its colour, tinted when they do not', async () => {
      // A finer grid than the suite's default, so the authored polities cover cells and a tint shows.
      const exact = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      exact.dev.political.rasterScale = 4
      await exact.pipeline.start()
      const exactCalls = asMock(exact.deps.layers.setTexture).mock.calls
      expect(pixels(exactCalls.at(-1))).toEqual(pixels(exactCalls[0]))
      expect(asMock(exact.deps.layers.rebuildFills)).toHaveBeenCalled()

      const grid = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      grid.dev.political.exactFills = false
      grid.dev.political.rasterScale = 4
      await grid.pipeline.start()
      const gridCalls = asMock(grid.deps.layers.setTexture).mock.calls
      expect(pixels(gridCalls.at(-1))).not.toEqual(pixels(gridCalls[0]))
    })

    // ATLAS-333, the dev, 2026-11-08: a year left is set aside, and comes back without being built again.
    it('puts 1100 back from the years set aside on a return from 1200, fetching and building nothing', async () => {
      const loads: number[] = []
      const { deps, dev, pipeline } = build({
        assets: fakeAssets({
          regions: {
            load: (year: number) => {
              loads.push(year)
              return Promise.resolve({ ...AUTHORED_YEAR, year })
            },
          },
        }),
      })
      shelvingLayers(deps.layers, deps.sources)
      await pipeline.start()
      dev.political.year = 1200
      await pipeline.rebuildPolitical()
      expect(asMock(deps.layers.shelveYear)).toHaveBeenCalledWith(1100)
      const eventsBefore = asMock(deps.layers.rebuildEvents).mock.calls.length

      // The layers pin the events of a year left before they landed, for the year asked: it is the one asked by then.
      const askedOnReturn: (number | null)[] = []
      const restore = asMock(deps.layers.restoreYear).getMockImplementation() as
        MapLayers['restoreYear'] | undefined
      if (restore === undefined) throw new Error('test: the shelf is not wired')
      asMock(deps.layers.restoreYear).mockImplementation((year: number) => {
        askedOnReturn.push(deps.sources.askedYear)
        return restore(year)
      })
      dev.political.year = 1100
      await pipeline.rebuildPolitical()
      expect(loads).toEqual([1100, 1200])
      expect(asMock(deps.layers.restoreYear)).toHaveBeenCalledWith(1100)
      expect(askedOnReturn).toEqual([1100])
      // Its events came back with it (66 ms to pin again, measured 2026-11-08).
      expect(asMock(deps.layers.rebuildEvents).mock.calls).toHaveLength(eventsBefore)
      expect(asMock(deps.layers.rebuildFills)).toHaveBeenCalledTimes(2)
      expect(deps.sources.askedYear).toBe(1100)
      expect(deps.sources.regionSet?.year).toBe(1100)
    })

    it('builds a year never set aside, and sets the one on screen aside only once the new one is ready', async () => {
      const second = deferred<RegionSet>()
      let year: Promise<RegionSet> = Promise.resolve(AUTHORED_YEAR)
      const { deps, dev, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => year } }),
      })
      shelvingLayers(deps.layers, deps.sources)
      await pipeline.start()
      year = second.promise
      dev.political.year = 1200
      const change = pipeline.rebuildPolitical()
      await flush()
      expect(asMock(deps.layers.shelveYear)).not.toHaveBeenCalled()
      second.resolve({ ...AUTHORED_YEAR, year: 1200 })
      await change
      expect(asMock(deps.layers.shelveYear)).toHaveBeenCalledWith(1100)
      expect(deps.sources.regionSet?.year).toBe(1200)
    })

    it('leaves the year on screen in place when the next one fails to load', async () => {
      let year: Promise<RegionSet> = Promise.resolve(AUTHORED_YEAR)
      const { deps, dev, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => year } }),
      })
      shelvingLayers(deps.layers, deps.sources)
      await pipeline.start()
      year = Promise.reject(new Error('offline'))
      dev.political.year = 1200
      await pipeline.rebuildPolitical()
      expect(asMock(deps.layers.shelveYear)).not.toHaveBeenCalled()
      expect(deps.sources.regionSet).toBe(AUTHORED_YEAR)
    })

    // Reviews QUAL-001, ARCH-001: a year set aside before the bake, and the bake failing, left the shelf a hollow year.
    it('sets nothing aside when the bake of the next year fails, the year on screen left whole', async () => {
      let year: RegionSet = AUTHORED_YEAR
      const { deps, dev, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(year) } }),
      })
      shelvingLayers(deps.layers, deps.sources)
      // Drawn through the grid, its texture tinted; then the exact fills switched back on, with no redraw: the next
      // year must bake the bare terrain again.
      dev.political.exactFills = false
      await pipeline.start()
      dev.political.exactFills = true
      asMock(deps.layers.setTexture).mockImplementation(() => {
        throw new Error('the GPU said no')
      })
      year = { ...AUTHORED_YEAR, year: 1200 }
      dev.political.year = 1200
      await pipeline.rebuildPolitical()
      expect(asMock(deps.layers.shelveYear)).not.toHaveBeenCalled()
      expect(deps.sources.regionSet).toBe(AUTHORED_YEAR)
      expect(deps.sources.askedYear).toBe(1100)
    })

    // Review R5: the cut runs beside the bake, before anything of the year on screen is touched.
    it('sets nothing aside and hands no cut when the next year’s cut fails, the year on screen left whole', async () => {
      let year: RegionSet = AUTHORED_YEAR
      const { deps, dev, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(year) } }),
      })
      shelvingLayers(deps.layers, deps.sources)
      await pipeline.start()
      const primed = asMock(deps.layers.primeFillCut).mock.calls.length
      vi.spyOn(fillModule, 'fillTriangles').mockImplementation(() => {
        throw new Error('the cut said no')
      })
      year = { ...AUTHORED_YEAR, year: 1200 }
      dev.political.year = 1200
      await pipeline.rebuildPolitical()
      expect(asMock(deps.layers.shelveYear)).not.toHaveBeenCalled()
      expect(asMock(deps.layers.primeFillCut).mock.calls).toHaveLength(primed)
      expect(deps.sources.regionSet).toBe(AUTHORED_YEAR)
      expect(asMock(deps.ui.reportAssetFailure)).toHaveBeenCalledWith('regions', expect.any(Error))
    })

    // ATLAS-333: the fills are cut by the compute before the year is laid, so laying them cuts nothing here.
    it('hands the layers the cut of an authored year’s very polities, one triangle list each', async () => {
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      await pipeline.start()
      const [regions, grid, fills] = asMock(deps.layers.primeFillCut).mock.calls[0] as [
        unknown,
        { segX: number; segY: number },
        Float32Array[],
      ]
      expect(regions).toBe(AUTHORED_YEAR.regions)
      expect(grid.segX).toBe(deps.dev.relief.segments)
      expect(fills).toHaveLength(AUTHORED_YEAR.regions.length)
      expect(firstCall(deps.layers.primeFillCut)).toBeLessThan(firstCall(deps.layers.rebuildFills))
    })

    it('measures each step of a change to an authored year, and only the return on a year set aside', async () => {
      const names: string[] = []
      let now = 0
      const { deps, dev, pipeline } = build({
        assets: fakeAssets({
          regions: { load: (year: number) => Promise.resolve({ ...AUTHORED_YEAR, year }) },
        }),
        clock: { now: () => (now += 1), measure: (name: string) => names.push(name) },
      })
      shelvingLayers(deps.layers, deps.sources)
      await pipeline.start()
      dev.political.year = 1200
      names.length = 0
      await pipeline.rebuildPolitical()
      expect(names).toEqual(
        expect.arrayContaining(
          ['fetch', 'cut', 'prepare', 'settle', 'fills', 'borders', 'total'].map(
            (step) => `atlas year 1200 ${step}`
          )
        )
      )
      dev.political.year = 1100
      names.length = 0
      await pipeline.rebuildPolitical()
      expect(names.filter((name) => !name.endsWith('names'))).toEqual([
        'atlas year 1100 restore',
        'atlas year 1100 total',
      ])
    })

    // ATLAS-333: 559 ms of the main thread for 1100's four tribes, measured in the worker instead.
    it('hands the layers a year’s tribes measured by the compute, after its sources are settled', async () => {
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(TRIBE_YEAR) } }),
      })
      await pipeline.start()
      const [grid, measured] = asMock(deps.layers.primeTribeCut).mock.calls[0] as [
        { segX: number },
        MeasuredTribes,
      ]
      expect(grid.segX).toBe(deps.dev.relief.segments)
      expect(measured.patches).toHaveLength(deps.sources.tribes.length)
      expect(firstCall(deps.layers.primeTribeCut)).toBeLessThan(firstCall(deps.layers.rebuildFills))
    })

    // Review R2: the tribes' mode lays the fills again, not the year — so it can move while the year is measured.
    it('hands the tribes over with the spill read before the measure, not the one of when they land', async () => {
      const { deps, dev, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(TRIBE_YEAR) } }),
      })
      dev.tribes.mode = 'outset'
      const real = patchModule.tribePatches
      vi.spyOn(patchModule, 'tribePatches').mockImplementation((...args) => {
        dev.tribes.mode = 'band'
        return real(...args)
      })
      await pipeline.start()
      const [, measured] = asMock(deps.layers.primeTribeCut).mock.calls[0] as [
        unknown,
        MeasuredTribes,
      ]
      expect(measured.settings.spill).toBe(true)
    })

    it('measures no tribe for a year with none', async () => {
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      await pipeline.start()
      expect(asMock(deps.layers.primeTribeCut)).not.toHaveBeenCalled()
    })

    it('cuts nothing ahead for a year the texture carries', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      expect(asMock(deps.layers.primeFillCut)).not.toHaveBeenCalled()
    })

    it('sets nothing aside when the same year is drawn again', async () => {
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      shelvingLayers(deps.layers, deps.sources)
      await pipeline.start()
      await pipeline.rebuildPolitical()
      expect(asMock(deps.layers.shelveYear)).not.toHaveBeenCalled()
      expect(asMock(deps.layers.restoreYear)).not.toHaveBeenCalled()
    })

    it('sets aside no year the texture carries: a payload year is built again on a return', async () => {
      let year: RegionSet = YEAR
      const { deps, dev, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(year) } }),
      })
      shelvingLayers(deps.layers, deps.sources)
      await pipeline.start()
      year = { ...AUTHORED_YEAR, year: 1200 }
      dev.political.year = 1200
      await pipeline.rebuildPolitical()
      expect(asMock(deps.layers.shelveYear)).not.toHaveBeenCalled()
    })

    // ATLAS-333: the startup's bare terrain is the very texture an authored year's fills lie on.
    it('bakes an authored year once, at the startup, and never again on a change to another', async () => {
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      await pipeline.start()
      expect(asMock(deps.layers.setTexture)).toHaveBeenCalledTimes(1)

      await pipeline.rebuildPolitical()
      expect(asMock(deps.layers.setTexture)).toHaveBeenCalledTimes(1)
      expect(asMock(deps.layers.rebuildFills)).toHaveBeenCalledTimes(2)
    })

    it('bakes the bare terrain again on a change from a tinted year to an authored one', async () => {
      let year: RegionSet = YEAR
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(year) } }),
      })
      deps.dev.political.rasterScale = 4
      await pipeline.start()
      const calls = asMock(deps.layers.setTexture).mock.calls
      expect(pixels(calls.at(-1))).not.toEqual(pixels(calls[0]))

      year = AUTHORED_YEAR
      await pipeline.rebuildPolitical()
      expect(calls).toHaveLength(3)
      expect(pixels(calls.at(-1))).toEqual(pixels(calls[0]))
    })

    it('keeps the texture on a change to an authored year when the year before was baked untinted', async () => {
      let year: RegionSet = YEAR
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(year) } }),
      })
      deps.dev.political.rasterScale = 4
      deps.dev.texture.politicalStrength = 0
      await pipeline.start()
      const calls = asMock(deps.layers.setTexture).mock.calls
      expect(pixels(calls.at(-1))).toEqual(pixels(calls[0]))

      year = AUTHORED_YEAR
      await pipeline.rebuildPolitical()
      expect(calls).toHaveLength(2)
    })

    it('tints an authored year in the colours the grid would have handed back', async () => {
      const exact = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      await exact.pipeline.start()
      const grid = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      grid.dev.political.exactFills = false
      await grid.pipeline.start()

      expect(exact.deps.sources.regionTints).toEqual(grid.deps.sources.regionTints)
      expect(exact.deps.sources.tintLevels).toEqual(grid.deps.sources.tintLevels)
    })

    it('leaves an authored year’s exact lines when asked to re-trace, and says so', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      await pipeline.start()
      const exact = deps.sources.derivedBorders
      await pipeline.rebuildBorderGeometry()
      expect(deps.sources.derivedBorders).toBe(exact)
      expect(asMock(deps.layers.rebuildBorders)).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('authored year'))
    })

    it('captions the bar with the year it loads, in the reader’s language', async () => {
      const { deps, dev, pipeline } = build()
      dev.political.year = 1100
      await pipeline.start()
      expect(asMock(deps.ui.progress.report)).toHaveBeenCalledWith(
        expect.any(Number),
        FR('loadingYear', { year: '1100' })
      )
    })

    it('captions each compute phase as it runs', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      expect(asMock(deps.ui.progress.report)).toHaveBeenCalledWith(
        expect.any(Number),
        FR('phaseRasterise')
      )
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
      // A degraded failure: the splash goes on the relief, the failure told over it (review QUAL-002, ATLAS-333).
      expect(asMock(deps.ui.dismissSplash)).toHaveBeenCalledTimes(1)
    })

    it('still stands the events when the year cannot be fetched, under its failure', async () => {
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.reject(new Error('404')) } }),
      })
      await pipeline.start()
      expect(deps.sources.mapDrawn).toBe(true)
      expect(asMock(deps.layers.rebuildEvents)).toHaveBeenCalled()
      expect(deps.sources.askedYear).toBe(1100)
    })

    // The dev, 2026-11-02: the events of 1100 were still shown on the map of 1200; and a change that fails must not
    // put 1200's events on 1100's map either (review QUAL-004).
    it('keeps the year of the map on screen for the events when a change of year fails', async () => {
      const load = vi.fn((year: number) =>
        year === 1100 ? Promise.resolve(YEAR) : Promise.reject(new Error('404'))
      )
      const { deps, pipeline } = build({ assets: fakeAssets({ regions: { load } }) })
      await pipeline.start()
      deps.dev.political.year = 1200
      await pipeline.rebuildPolitical()
      expect(deps.sources.askedYear).toBe(1100)
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
      // Nothing behind it: the splash stays under the message, the bar closed (review QUAL-002, ATLAS-333).
      expect(asMock(deps.ui.dismissSplash)).not.toHaveBeenCalled()
      expect(asMock(deps.ui.progress.end)).toHaveBeenCalled()
    })

    // ATLAS-333, review QUAL-001: which path settles a year.
    it('settles an authored year the fills paint in the compute, never on this thread', async () => {
      const onThisThread = vi.spyOn(yearBordersModule, 'settleYearBorders')
      const { deps, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      await pipeline.start()
      expect(onThisThread).not.toHaveBeenCalled()
      expect(deps.sources.borderPatterns?.get('0:0')).toBe('solid')
    })

    it('settles an authored year drawn through the grid on this thread', async () => {
      const onThisThread = vi.spyOn(yearBordersModule, 'settleYearBorders')
      const { dev, pipeline } = build({
        assets: fakeAssets({ regions: { load: () => Promise.resolve(AUTHORED_YEAR) } }),
      })
      dev.political.exactFills = false
      await pipeline.start()
      expect(onThisThread).toHaveBeenCalledOnce()
    })

    // ATLAS-333: the downloads' bytes counted, the bar never still through them.
    it('moves the bar inside the relief’s download as its bytes arrive', async () => {
      const { deps, pipeline } = build({
        assets: fakeAssets({
          // Each tells its size first, as core's readBytes does; the relief then half in.
          landMask: {
            load: (onBytes) => {
              onBytes?.(0, 1000)
              return Promise.resolve(MASK)
            },
          },
          heightmap: {
            load: (onBytes) => {
              onBytes?.(0, 1000)
              onBytes?.(500, 1000)
              return Promise.resolve(DEM)
            },
          },
        }),
      })
      await pipeline.start()
      const [from, to] = STARTUP_SLICES.terrain
      const inside = (asMock(deps.ui.progress.report).mock.calls as [number, string][]).filter(
        ([fraction, label]) => label === FR('phaseTerrain') && fraction > from && fraction < to
      )
      expect(inside.length).toBeGreaterThan(0)
    })

    // Review QUAL-002: s01's « the composition of the texture moves the bar row by row ».
    it('moves the bar inside the texture’s composition, not only at its ends', async () => {
      const { deps, pipeline } = build()
      await pipeline.start()
      const [from, to] = STARTUP_SLICES.texture
      const inside = (asMock(deps.ui.progress.report).mock.calls as [number, string][]).filter(
        ([fraction, label]) => label === FR('phaseBake') && fraction > from && fraction < to
      )
      expect(inside.length).toBeGreaterThan(0)
    })

    // The same check as the land mask: rivers cropped to other ground would slide off their valleys.
    it('refuses rivers covering other ground than the relief, and says so', async () => {
      const river = { rank: 1, kind: 'River', name: 'Rhine', points: [{ u: 0, v: 0 }] }
      const slid = { ...META.bbox, east: META.bbox.east + 1 }
      const { deps, pipeline } = build({
        assets: fakeAssets({
          rivers: { load: () => Promise.resolve({ source: 'test', bbox: slid, rivers: [river] }) },
        }),
      })
      await pipeline.start()
      await Promise.resolve()
      expect(asMock(deps.ui.reportAssetFailure)).toHaveBeenCalledWith(
        'rivers',
        expect.objectContaining({ failure: 'semantic' })
      )
      expect(deps.sources.riverData).toEqual([])
    })

    it('installs rivers that arrived before the relief once the relief is in', async () => {
      const river = { rank: 1, kind: 'River', name: 'Rhine', points: [{ u: 0, v: 0 }] }
      const { deps, pipeline } = build({
        assets: fakeAssets({
          rivers: {
            load: () => Promise.resolve({ source: 'test', bbox: META.bbox, rivers: [river] }),
          },
        }),
      })
      await pipeline.start()
      await Promise.resolve()
      expect(deps.sources.riverData).toEqual([river])
      expect(asMock(deps.ui.reportAssetFailure)).not.toHaveBeenCalled()
    })

    // QUAL-005: each arrival order forced, so each of settleRivers' two callers is the one that fires.
    it.each(['rivers first', 'relief first'] as const)(
      'installs the rivers whichever arrives first — %s',
      async (order) => {
        const river = { rank: 1, kind: 'River', name: 'Rhine', points: [{ u: 0, v: 0 }] }
        const rivers = deferred<RiverSet>()
        const relief = deferred<typeof DEM>()
        const { deps, pipeline } = build({
          assets: fakeAssets({
            heightmap: { load: () => relief.promise },
            rivers: { load: () => rivers.promise },
          }),
        })
        const started = pipeline.start()
        if (order === 'rivers first') {
          rivers.resolve({ source: 'test', bbox: META.bbox, rivers: [river] })
          await flush()
          expect(deps.sources.riverData).toEqual([])
          relief.resolve(DEM)
          await started
        } else {
          relief.resolve(DEM)
          await started
          expect(deps.sources.riverData).toEqual([])
          rivers.resolve({ source: 'test', bbox: META.bbox, rivers: [river] })
          await flush()
        }
        expect(deps.sources.riverData).toEqual([river])
      }
    )

    // ARCH-001 (2026-10-12): draped before the relief source exists, every river sits at sea level.
    it('never rebuilds the rivers while the relief source is missing', async () => {
      const river = { rank: 1, kind: 'River', name: 'Rhine', points: [{ u: 0, v: 0 }] }
      const { deps, pipeline } = build({
        assets: fakeAssets({
          rivers: {
            load: () => Promise.resolve({ source: 'test', bbox: META.bbox, rivers: [river] }),
          },
        }),
      })
      const seen: boolean[] = []
      asMock(deps.layers.rebuildRivers).mockImplementation(() => {
        if (deps.sources.riverData.length > 0) seen.push(deps.sources.reliefSource !== null)
      })
      await pipeline.start()
      await Promise.resolve()
      expect(seen.length).toBeGreaterThan(0)
      expect(seen.every(Boolean)).toBe(true)
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
