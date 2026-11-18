import { afterEach, describe, expect, it, vi } from 'vitest'

import { isAssetError } from './assetError'
import { createAuthoredYearSource, parseYearManifest } from './yearManifest'

import type { RegionSource } from './regionSource'

const bbox = { west: -45, south: 11.178401873711783, east: 78.75, north: 76.84081641443098 }

const manifest = { version: 1, bbox, years: [1100] }

const registry = {
  version: 1,
  year: 1100,
  polities: [
    {
      id: 'fr-couronne',
      name: 'Reaume de France',
      rank: 'kingdom',
      status: 'country',
      suzerain: null,
      existsFrom: 987,
      existsTo: null,
      colour: null,
      wikidata: null,
    },
  ],
}

const polities = {
  version: 1,
  year: 1100,
  sources: [{ id: 0, name: 'Natural Earth 10m coastline', licence: 'public domain' }],
  anchors: [
    [0, 48],
    [2, 48],
    [2, 46],
    [0, 46],
  ],
  anchorSource: [0, 0, 0, 0],
  claims: [{ polity: 'fr-couronne', rings: [[0, 1, 2, 3]] }],
  deliberateGaps: [],
}

const borders = { version: 1, year: 1100, pairs: [], runs: [] }

/** The four files of an authored 1100, as the server would answer them. */
const served: Record<string, unknown> = {
  '/years/index.json': manifest,
  '/years/1100/registry.json': registry,
  '/years/1100/polities.json': polities,
  '/years/1100/borders.json': borders,
}

/** Stand in for `fetch`, answering from a table and 404ing on anything else. */
function stubFetch(table: Record<string, unknown>, missing: string[] = []): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((path: string) => {
      if (missing.includes(path))
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) })
      const body = table[path]
      if (body === undefined)
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) })
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
    })
  )
}

/** The source under test, wired to the stubbed server. */
function source(): RegionSource {
  return createAuthoredYearSource({ manifestUrl: '/years/index.json', yearsBase: '/years' })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseYearManifest', () => {
  describe('happy path', () => {
    it('reads the version, the frame and the years', () => {
      const read = parseYearManifest(manifest, '/years/index.json')
      expect(read.years).toEqual([1100])
      expect(read.bbox.west).toBe(-45)
    })
  })

  describe('variants', () => {
    it('reads an empty list, which is what ships before any year is drawn', () => {
      expect(parseYearManifest({ version: 1, bbox, years: [] }, 'm').years).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('refuses a frame whose edges are the wrong way round', () => {
      const swapped = { version: 1, bbox: { ...bbox, north: 0 }, years: [] }
      expect(() => parseYearManifest(swapped, 'm')).toThrow()
    })

    it('refuses an unrecognised key rather than dropping it', () => {
      expect(() => parseYearManifest({ ...manifest, yearz: [1100] }, 'm')).toThrow()
    })

    it('reports under the registry kind, because no year can be opened without it', () => {
      try {
        parseYearManifest(null, '/years/index.json')
      } catch (error: unknown) {
        expect(isAssetError(error) && error.asset).toBe('yearRegistry')
      }
    })
  })

  describe('unmanaged errors', () => {
    it('refuses anything that is not an object', () => {
      for (const value of [null, undefined, 7, 'manifest', []])
        expect(() => parseYearManifest(value, 'm')).toThrow()
    })
  })

  describe('edge cases', () => {
    it('refuses version zero', () => {
      expect(() => parseYearManifest({ ...manifest, version: 0 }, 'm')).toThrow()
    })
  })
})

describe('createAuthoredYearSource', () => {
  describe('happy path', () => {
    it('reads a listed year from its folder and projects it', async () => {
      stubFetch(served)
      const set = await source().load(1100)
      expect(set.year).toBe(1100)
      expect(set.regions).toHaveLength(1)
      expect(set.regions[0]?.name).toBe('Reaume de France')
    })

    it('keeps the year as authored, with the manifest’s frame, for the exact borders', async () => {
      stubFetch(served)
      const set = await source().load(1100)
      expect(set.authored?.bbox).toEqual(bbox)
      expect(set.authored?.year.polities.anchors).toEqual(polities.anchors)
    })
  })

  describe('variants', () => {
    it('fetches the manifest once and keeps it, so a slider costs no round trip', async () => {
      stubFetch(served)
      const source_ = source()
      await source_.load(1100)
      await source_.load(1100)
      await source_.load(1500).catch(() => undefined)
      const manifestCalls = vi
        .mocked(fetch)
        .mock.calls.filter(([path]) => path === '/years/index.json')
      expect(manifestCalls).toHaveLength(1)
    })

    it('never touches a year folder for a year that has no map', async () => {
      stubFetch(served)
      await source()
        .load(1500)
        .catch(() => undefined)
      const folderCalls = vi
        .mocked(fetch)
        .mock.calls.filter(([path]) => typeof path === 'string' && path.startsWith('/years/1500/'))
      expect(folderCalls).toHaveLength(0)
    })
  })

  describe('managed errors', () => {
    it('refuses a year the manifest does not list: it has no map, and says which years have one', async () => {
      // Read from the per-century borders before, under the GPL: nothing reads them any more (ATLAS-373).
      stubFetch(served)
      const failure: unknown = await source()
        .load(1500)
        .catch((error: unknown) => error)
      expect(failure).toMatchObject({ asset: 'regions', failure: 'absent' })
      expect(isAssetError(failure) ? failure.detail : '').toMatch(/1500 has no map.*1100/)
    })

    it('refuses every year when the manifest lists none', async () => {
      stubFetch({ ...served, '/years/index.json': { version: 1, bbox, years: [] } })
      await expect(source().load(1100)).rejects.toMatchObject({ asset: 'regions' })
    })

    it('asks for no other file when the year has no map', async () => {
      stubFetch(served)
      await source()
        .load(1500)
        .catch(() => undefined)
      const asked = vi.mocked(fetch).mock.calls.map(([path]) => path)
      expect(asked).toEqual(['/years/index.json'])
    })

    it('fails loudly when a LISTED year cannot be loaded', async () => {
      // The whole reason the manifest exists: a 404 on a listed folder is a failure, said as one.
      stubFetch(served, ['/years/1100/polities.json'])
      await expect(source().load(1100)).rejects.toMatchObject({
        asset: 'yearPolities',
        failure: 'transport',
      })
    })

    it('fails loudly when a listed year is malformed', async () => {
      stubFetch({ ...served, '/years/1100/registry.json': { version: 1 } })
      await expect(source().load(1100)).rejects.toMatchObject({
        asset: 'yearRegistry',
        failure: 'schema',
      })
    })

    it('fails loudly when a listed year disagrees with itself', async () => {
      stubFetch({ ...served, '/years/1100/borders.json': { ...borders, year: 1110 } })
      await expect(source().load(1100)).rejects.toMatchObject({
        failure: 'consistency',
      })
    })

    it('reports a missing manifest as transport', async () => {
      stubFetch({}, ['/years/index.json'])
      await expect(source().load(1100)).rejects.toMatchObject({
        asset: 'yearRegistry',
        failure: 'transport',
      })
    })
  })

  describe('unmanaged errors', () => {
    it('lets a network rejection through rather than dressing it as a missing year', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new Error('offline')))
      )
      await expect(source().load(1100)).rejects.toThrow('offline')
    })
  })

  describe('edge cases', () => {
    it('projects against the manifest’s frame', async () => {
      // The DEM's frame is the only box a year projects against; any other would slide every
      // border off the terrain, so the check is that the first anchor lands where the DEM's frame puts it.
      stubFetch(served)
      const set = await source().load(1100)
      const first = set.regions[0]?.rings[0]?.[0]
      const expectedU = (0 - bbox.west) / (bbox.east - bbox.west)
      expect(first?.u).toBeCloseTo(expectedU, 10)
    })

    it('lists a year before the common era, and still refuses one it does not list', async () => {
      stubFetch({ ...served, '/years/index.json': { version: 1, bbox, years: [-500] } })
      await expect(source().load(1100)).rejects.toMatchObject({
        asset: 'regions',
        detail: expect.stringContaining('-500') as string,
      })
    })
  })
})
