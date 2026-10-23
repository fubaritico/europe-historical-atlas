import { afterEach, describe, expect, it, vi } from 'vitest'

import { createFetchHeightmapSource } from './heightmap'
import { createFetchLandMaskSource } from './landMask'
import { createFetchRegionSource } from './regionSource'
import { createFetchRiverSource } from './riverSource'
import { createAuthoredYearSource } from './yearManifest'
import { fetchYearFiles, yearPaths } from './yearSource'

import type { RegionSource } from './regionSource'

/**
 * Every reader of the atlas's files goes through the answer delay of REPO-275: each request carries the
 * delay's signal. Without this, any one of them could go back to a bare `fetch` and no test would fall —
 * the delay itself is tested in `utils/fetchWithin.test.ts`.
 */

/** A fetch that records each call and refuses it, so a load stops right after its first request. */
function recordingFetch() {
  const fetchMock = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>(() =>
    Promise.reject(new Error('stopped by the test'))
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** A region source that must not be reached. */
const UNREACHED: RegionSource = {
  load: () => Promise.reject(new Error('the unauthored source was reached')),
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the readers of the atlas’s files', () => {
  describe('happy path', () => {
    it.each([
      ['the relief', () => createFetchHeightmapSource('/heightmaps/x').load()],
      ['the land mask', () => createFetchLandMaskSource('/masks/x').load()],
      ['the rivers', () => createFetchRiverSource('/rivers/x.json').load()],
      [
        'the regions of a century',
        () => createFetchRegionSource((year) => `/borders/${String(year)}.json`).load(1100),
      ],
      ['the files of a year', () => fetchYearFiles(yearPaths('/years', 1100))],
      [
        'the manifest of the years',
        () =>
          createAuthoredYearSource({
            manifestUrl: '/years/index.json',
            yearsBase: '/years',
            unauthored: UNREACHED,
          }).load(1100),
      ],
    ])('%s: read through the answer delay', async (_name, load) => {
      const fetchMock = recordingFetch()
      await expect(load()).rejects.toThrow('stopped by the test')
      expect(fetchMock).toHaveBeenCalled()
      for (const [, init] of fetchMock.mock.calls) expect(init?.signal).toBeInstanceOf(AbortSignal)
    })
  })

  // L2–L5: N/A — this file guards one wiring, the same for each reader; their behaviour is in their own suites.
})
