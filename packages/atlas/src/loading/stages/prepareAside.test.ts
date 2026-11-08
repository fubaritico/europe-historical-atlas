// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { httpError } from '@europe-historical-atlas/core/data/assetError'

import { stubNameFace } from '../testing/nameFaceStubs'
import { asMock, build, deferred, fakeAssets, shelvingLayers } from '../testing/pipelineStubs'
import { AUTHORED_FILES, AUTHORED_YEAR, META, YEAR } from '../testing/yearFixtures'

import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'

/**
 * The test's authored year under another year's number — its own files, as on disk: the names are cached by the year's
 * content, so two years sharing one file would share one placement.
 * @param year - the year
 * @returns the year, read as the atlas reads it
 */
function authoredIn(year: number): RegionSet {
  return {
    ...AUTHORED_YEAR,
    year,
    authored: { year: { ...AUTHORED_FILES, year }, bbox: META.bbox },
  }
}

/**
 * A map started on 1100, authored, its names laid, setting years aside as the shelf does; each year read as asked.
 * @param load - how a year is read; authored years by default
 * @returns the pipeline, its deps and the years read
 */
async function startedOn1100(
  load: (year: number) => Promise<RegionSet> = (year) => Promise.resolve(authoredIn(year))
) {
  stubNameFace()
  const loads: number[] = []
  const built = build({
    assets: fakeAssets({
      regions: {
        load: (year: number) => {
          loads.push(year)
          return load(year)
        },
      },
    }),
  })
  shelvingLayers(built.deps.layers, built.deps.sources)
  await built.pipeline.start()
  return { ...built, loads }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ATLAS-333, the dev, 2026-11-08 evening: the maps either side prepared in the background, never shown.
describe('prepareAside', () => {
  describe('happy path', () => {
    it('lays 1200 aside behind 1100, and puts 1100 back as it was', async () => {
      const { deps, pipeline } = await startedOn1100()
      const fillsBefore = asMock(deps.layers.rebuildFills).mock.calls.length
      await expect(pipeline.prepareAside(1200, () => true)).resolves.toEqual({ kind: 'ready' })
      expect(asMock(deps.layers.shelveYear).mock.calls).toEqual([[1100], [1200]])
      expect(asMock(deps.layers.restoreYear)).toHaveBeenLastCalledWith(1100)
      expect(asMock(deps.layers.rebuildFills).mock.calls.length).toBe(fillsBefore + 1)
      expect([deps.sources.askedYear, deps.sources.regionSet?.year]).toEqual([1100, 1100])
    })
  })

  describe('variants', () => {
    // ATLAS-396: its first showing was one frame of 43 ms on the built site, the buffers sent to the GPU then.
    it('sends 1200 to the GPU unseen once it is aside, before 1100 comes back', async () => {
      const { deps, pipeline } = await startedOn1100()
      await pipeline.prepareAside(1200, () => true)
      expect(asMock(deps.layers.uploadYear).mock.calls).toEqual([[1200]])
      const [, aside] = asMock(deps.layers.shelveYear).mock.invocationCallOrder
      const [upload] = asMock(deps.layers.uploadYear).mock.invocationCallOrder
      const back = asMock(deps.layers.restoreYear).mock.invocationCallOrder.at(-1)
      expect([(aside ?? 0) < (upload ?? 0), (upload ?? 0) < (back ?? 0)]).toEqual([true, true])
    })

    // Measured on the built site, 2026-11-08: building the names' layer on a first showing cost ~150 ms.
    it('sets 1200 aside with its names laid, so it shows whole', async () => {
      const { deps, pipeline } = await startedOn1100()
      const shelve = asMock(deps.layers.shelveYear).getMockImplementation() as
        ((year: number) => void) | undefined
      if (shelve === undefined) throw new Error('test: the shelf is not wired')
      // The real shelf empties the names with the year; this one keeps 1100's, so 1200's are told from them.
      const shownNames = deps.sources.yearNames
      const namedWhenAside: Record<number, boolean> = {}
      asMock(deps.layers.shelveYear).mockImplementation((year: number) => {
        const names = deps.sources.yearNames
        namedWhenAside[year] = names !== null && names !== shownNames
        shelve(year)
      })
      await pipeline.prepareAside(1200, () => true)
      expect(namedWhenAside[1200]).toBe(true)
    })

    it('reads nothing for the map shown, nor for one already aside', async () => {
      const { pipeline, loads } = await startedOn1100()
      await pipeline.prepareAside(1200, () => true)
      await pipeline.prepareAside(1100, () => true)
      await pipeline.prepareAside(1200, () => true)
      expect(loads).toEqual([1100, 1200])
    })

    it('puts a map off while a change of year is being drawn', async () => {
      const next = deferred<RegionSet>()
      const { dev, pipeline } = await startedOn1100((year) =>
        year === 1300 ? next.promise : Promise.resolve(authoredIn(year))
      )
      dev.political.year = 1300
      const change = pipeline.rebuildPolitical()
      await expect(pipeline.prepareAside(1200, () => true)).resolves.toEqual({
        kind: 'later',
        why: 'a change of year is being drawn',
      })
      next.resolve(authoredIn(1300))
      await change
    })

    it('lays nothing aside once the map is no longer wanted', async () => {
      const { deps, pipeline } = await startedOn1100()
      await expect(pipeline.prepareAside(1200, () => false)).resolves.toEqual({ kind: 'dropped' })
      expect(asMock(deps.layers.shelveYear)).not.toHaveBeenCalled()
    })

    it('frees through the layers every map aside but the window', async () => {
      const { deps, pipeline } = await startedOn1100()
      pipeline.keepYears([1100, 1200])
      expect(asMock(deps.layers.keepYears)).toHaveBeenCalledWith([1100, 1200])
    })
  })

  describe('managed errors', () => {
    it('qualifies a network failure recoverable, an absent file irreversible', async () => {
      const { pipeline } = await startedOn1100((year) => {
        if (year === 1200) return Promise.reject(new TypeError('Failed to fetch'))
        if (year === 1300) return Promise.reject(httpError('yearPolities', '/years/1300', 404))
        return Promise.resolve(authoredIn(year))
      })
      const network = await pipeline.prepareAside(1200, () => true)
      const absent = await pipeline.prepareAside(1300, () => true)
      expect(network).toMatchObject({ kind: 'failed', recoverable: true })
      expect(absent).toMatchObject({ kind: 'failed', recoverable: false })
    })

    it('skips a year the texture carries: it cannot be set aside', async () => {
      const { deps, pipeline } = await startedOn1100((year) =>
        Promise.resolve(year === 1200 ? { ...YEAR, year } : authoredIn(year))
      )
      await expect(pipeline.prepareAside(1200, () => true)).resolves.toEqual({
        kind: 'skipped',
        why: 'its countries are painted in the texture',
      })
      expect(asMock(deps.layers.shelveYear)).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    // Review ARCH-004: a background task never leaves the reader a half-made map.
    it('frees a map that fails half laid and puts the map shown back, then throws on', async () => {
      const { deps, pipeline } = await startedOn1100()
      asMock(deps.layers.rebuildBorders).mockImplementationOnce(() => {
        throw new Error('defect')
      })
      await expect(pipeline.prepareAside(1200, () => true)).rejects.toThrow('defect')
      expect(asMock(deps.layers.discardYear)).toHaveBeenCalledOnce()
      expect(asMock(deps.layers.restoreYear)).toHaveBeenLastCalledWith(1100)
      expect([deps.sources.askedYear, deps.sources.regionSet?.year]).toEqual([1100, 1100])
      expect(asMock(deps.layers.holdsYear)(1200)).toBe(false)
    })
  })

  describe('edge cases', () => {
    // Review ARCH-002: busy before any work is put off at once, nothing read nor cut to be thrown away.
    it('reads nothing while the names of the map shown are not laid', async () => {
      const { deps, pipeline, loads } = await startedOn1100()
      deps.sources.yearNames = null
      await expect(pipeline.prepareAside(1200, () => true)).resolves.toEqual({
        kind: 'later',
        why: 'the names of the map shown are not laid yet',
      })
      expect(loads).toEqual([1100])
    })

    it('holds the prepared map aside and the shown one on screen, never the reverse', async () => {
      const { deps, pipeline } = await startedOn1100()
      await pipeline.prepareAside(1200, () => true)
      expect([asMock(deps.layers.holdsYear)(1200), asMock(deps.layers.holdsYear)(1100)]).toEqual([
        true,
        false,
      ])
    })
  })
})
