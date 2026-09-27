import { afterEach, describe, expect, it, vi } from 'vitest'

import { isAssetError } from './assetError'
import { createAuthoredYearSource, parseYearManifest } from './yearManifest'

import type { RegionSet, RegionSource } from './regionSource'

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
  editorialZone: { west: -45, south: 20, east: 60, north: 76 },
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

/** A stand-in for the per-century payloads, recording what it was asked for. */
function unauthoredSource(): RegionSource & { asked: number[] } {
  const asked: number[] = []
  return {
    asked,
    load(year: number): Promise<RegionSet> {
      asked.push(year)
      return Promise.resolve({ year, regions: [] })
    },
  }
}

/** The source under test, wired to the stubbed server. */
function source(unauthored: RegionSource): RegionSource {
  return createAuthoredYearSource({
    manifestUrl: '/years/index.json',
    yearsBase: '/years',
    unauthored,
  })
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
      const set = await source(unauthoredSource()).load(1100)
      expect(set.year).toBe(1100)
      expect(set.regions).toHaveLength(1)
      expect(set.regions[0]?.name).toBe('Reaume de France')
    })

    it('leaves a year nobody has drawn to the source it was given', async () => {
      stubFetch(served)
      const unauthored = unauthoredSource()
      const set = await source(unauthored).load(1500)
      expect(unauthored.asked).toEqual([1500])
      expect(set.year).toBe(1500)
    })
  })

  describe('variants', () => {
    it('fetches the manifest once and keeps it, so a slider costs no round trip', async () => {
      stubFetch(served)
      const source_ = source(unauthoredSource())
      await source_.load(1500)
      await source_.load(1600)
      await source_.load(1700)
      const manifestCalls = vi
        .mocked(fetch)
        .mock.calls.filter(([path]) => path === '/years/index.json')
      expect(manifestCalls).toHaveLength(1)
    })

    it('never touches a year folder for an unauthored year', async () => {
      stubFetch(served)
      await source(unauthoredSource()).load(1500)
      const folderCalls = vi
        .mocked(fetch)
        .mock.calls.filter(([path]) => typeof path === 'string' && path.startsWith('/years/1500/'))
      expect(folderCalls).toHaveLength(0)
    })

    it('ships with an empty list, in which case nothing changes for anyone', async () => {
      stubFetch({ ...served, '/years/index.json': { version: 1, bbox, years: [] } })
      const unauthored = unauthoredSource()
      await source(unauthored).load(1100)
      expect(unauthored.asked).toEqual([1100])
    })
  })

  describe('managed errors', () => {
    it('fails loudly when a LISTED year cannot be loaded, rather than falling back', async () => {
      // The whole reason the manifest exists. A 404 on a listed folder is a failure, and answering it
      // with the old payload would show last century's borders with nothing said.
      stubFetch(served, ['/years/1100/polities.json'])
      const unauthored = unauthoredSource()
      await expect(source(unauthored).load(1100)).rejects.toMatchObject({
        asset: 'yearPolities',
        failure: 'transport',
      })
      expect(unauthored.asked).toEqual([])
    })

    it('fails loudly when a listed year is malformed', async () => {
      stubFetch({ ...served, '/years/1100/registry.json': { version: 1 } })
      await expect(source(unauthoredSource()).load(1100)).rejects.toMatchObject({
        asset: 'yearRegistry',
        failure: 'schema',
      })
    })

    it('fails loudly when a listed year disagrees with itself', async () => {
      stubFetch({ ...served, '/years/1100/borders.json': { ...borders, year: 1110 } })
      await expect(source(unauthoredSource()).load(1100)).rejects.toMatchObject({
        failure: 'consistency',
      })
    })

    it('reports a missing manifest as transport, and asks nobody for anything', async () => {
      stubFetch({}, ['/years/index.json'])
      const unauthored = unauthoredSource()
      await expect(source(unauthored).load(1100)).rejects.toMatchObject({
        asset: 'yearRegistry',
        failure: 'transport',
      })
      expect(unauthored.asked).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('lets a network rejection through rather than dressing it as a missing year', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new Error('offline')))
      )
      await expect(source(unauthoredSource()).load(1100)).rejects.toThrow('offline')
    })
  })

  describe('edge cases', () => {
    it('projects against the manifest’s frame, not the year’s editorial zone', async () => {
      // The editorial zone above is a different box on purpose. Projecting against it would slide every
      // border off the terrain, so the check is that the first anchor lands where the DEM's frame puts it.
      stubFetch(served)
      const set = await source(unauthoredSource()).load(1100)
      const first = set.regions[0]?.rings[0]?.[0]
      const expectedU = (0 - bbox.west) / (bbox.east - bbox.west)
      expect(first?.u).toBeCloseTo(expectedU, 10)
    })

    it('handles a year before the common era', async () => {
      stubFetch({ ...served, '/years/index.json': { version: 1, bbox, years: [-500] } })
      const unauthored = unauthoredSource()
      await source(unauthored).load(1100)
      expect(unauthored.asked).toEqual([1100])
    })
  })
})
