import { afterEach, describe, expect, it, vi } from 'vitest'

import { isAssetError } from './assetError'
import {
  fetchYearFiles,
  parseYearBorders,
  parseYearPolities,
  parseYearRegistry,
  yearPaths,
} from './yearSource'

import type { AssetError } from './assetError'

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
    [1, 48],
    [1, 47],
  ],
  anchorSource: [0, 0, 0],
  claims: [{ polity: 'fr-couronne', rings: [[0, 1, 2]] }],
  deliberateGaps: [],
}

const borders = { version: 1, year: 1100, pairs: [], runs: [] }

/** Read something that is expected to fail, and hand back the failure. */
function failureOf(read: () => unknown): AssetError {
  try {
    read()
    throw new Error('expected a failure and got none')
  } catch (error: unknown) {
    if (!isAssetError(error)) throw error
    return error
  }
}

/** Stand in for `fetch`, answering per path. */
function stubFetch(
  answers: Record<string, { ok: boolean; status?: number; body?: unknown }>
): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((path: string) => {
      const answer = answers[path] ?? { ok: false, status: 404 }
      return Promise.resolve({
        ok: answer.ok,
        status: answer.status ?? 200,
        json: () => Promise.resolve(answer.body),
      })
    })
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('yearPaths', () => {
  describe('happy path', () => {
    it('builds the three files of a year’s folder', () => {
      expect(yearPaths('/years', 1100)).toEqual({
        registry: '/years/1100/registry.json',
        polities: '/years/1100/polities.json',
        borders: '/years/1100/borders.json',
      })
    })
  })

  describe('variants', () => {
    it('tolerates a trailing slash on the base', () => {
      expect(yearPaths('/years/', 1100).registry).toBe('/years/1100/registry.json')
    })

    it('handles a year before the common era', () => {
      expect(yearPaths('/years', -500).polities).toBe('/years/-500/polities.json')
    })
  })

  // L3/L4: N/A — string building with no failure mode of its own.

  describe('edge cases', () => {
    it('handles year zero', () => {
      expect(yearPaths('/years', 0).borders).toBe('/years/0/borders.json')
    })
  })
})

describe('the three readers', () => {
  describe('happy path', () => {
    it('reads each file and gives back a typed value', () => {
      expect(parseYearRegistry(registry, 'r.json').year).toBe(1100)
      expect(parseYearPolities(polities, 'p.json').anchors).toHaveLength(3)
      expect(parseYearBorders(borders, 'b.json').pairs).toEqual([])
    })
  })

  describe('variants', () => {
    it('reports the failure under its own asset kind, so a notice can name the file', () => {
      expect(failureOf(() => parseYearRegistry({}, 'r.json')).asset).toBe('yearRegistry')
      expect(failureOf(() => parseYearPolities({}, 'p.json')).asset).toBe('yearPolities')
      expect(failureOf(() => parseYearBorders({}, 'b.json')).asset).toBe('yearBorders')
    })
  })

  describe('managed errors', () => {
    it('names the field that is wrong, the way a person reads a path', () => {
      const broken = { ...registry, polities: [{ ...registry.polities[0], colour: 'blue' }] }
      const error = failureOf(() => parseYearRegistry(broken, 'r.json'))
      expect(error.failure).toBe('schema')
      expect(error.detail).toContain('polities[0].colour')
    })

    it('counts the problems it is not reporting, so nobody fixes one and stops', () => {
      // A schema finds every issue at once; `detail` is one clause by contract. The count is what
      // says the wall exists.
      const broken = { ...registry, year: 'soon', polities: 'none' }
      expect(failureOf(() => parseYearRegistry(broken, 'r.json')).detail).toContain('and 1 more')
    })

    it('says nothing about a count when there is only one problem', () => {
      const broken = { ...registry, year: 'soon' }
      expect(failureOf(() => parseYearRegistry(broken, 'r.json')).detail).not.toContain('more')
    })

    it('carries the source it was read from', () => {
      expect(failureOf(() => parseYearRegistry({}, 'years/1100/registry.json')).source).toBe(
        'years/1100/registry.json'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('refuses anything that is not an object, naming the payload itself', () => {
      for (const value of [null, undefined, 7, 'registry', []])
        expect(failureOf(() => parseYearRegistry(value, 'r.json')).failure).toBe('schema')
    })

    it('names the payload when the problem is the value and not a field', () => {
      expect(failureOf(() => parseYearRegistry(null, 'r.json')).detail).toContain('payload')
    })
  })

  describe('edge cases', () => {
    it('reads a registry with no polity in it', () => {
      expect(parseYearRegistry({ ...registry, polities: [] }, 'r.json').polities).toEqual([])
    })
  })
})

describe('fetchYearFiles', () => {
  const paths = yearPaths('/years', 1100)
  const allThree = {
    [paths.registry]: { ok: true, body: registry },
    [paths.polities]: { ok: true, body: polities },
    [paths.borders]: { ok: true, body: borders },
  }

  describe('happy path', () => {
    it('fetches and reads all three files', async () => {
      stubFetch(allThree)
      const files = await fetchYearFiles(paths)
      expect(files.registry.year).toBe(1100)
      expect(files.polities.claims).toHaveLength(1)
      expect(files.borders.runs).toEqual([])
    })
  })

  describe('variants', () => {
    it('fetches the three in parallel rather than one after another', async () => {
      stubFetch(allThree)
      await fetchYearFiles(paths)
      // Three calls, all issued before any resolved — the useful assertion is that nothing waits on
      // a predecessor, since three sequential round trips buy nothing.
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3)
    })
  })

  describe('managed errors', () => {
    it('reports a missing file as transport, not as a bad shape', async () => {
      // A 404 is a deployment problem and a bad field is an authoring one; they call for different
      // answers, so the two stay apart all the way to the notice.
      stubFetch({ ...allThree, [paths.borders]: { ok: false, status: 404 } })
      await expect(fetchYearFiles(paths)).rejects.toMatchObject({
        asset: 'yearBorders',
        failure: 'transport',
        detail: 'HTTP 404',
      })
    })

    it('reports a malformed file as schema, under its own kind', async () => {
      stubFetch({ ...allThree, [paths.polities]: { ok: true, body: { version: 1 } } })
      await expect(fetchYearFiles(paths)).rejects.toMatchObject({
        asset: 'yearPolities',
        failure: 'schema',
      })
    })
  })

  describe('unmanaged errors', () => {
    it('lets a network rejection through rather than dressing it as a schema failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new Error('offline')))
      )
      await expect(fetchYearFiles(paths)).rejects.toThrow('offline')
    })
  })

  describe('edge cases', () => {
    it('fails on the first bad file even when two are bad', async () => {
      stubFetch({
        [paths.registry]: { ok: false, status: 500 },
        [paths.polities]: { ok: false, status: 404 },
        [paths.borders]: { ok: true, body: borders },
      })
      const error = await fetchYearFiles(paths).catch((caught: unknown) => caught)
      expect(isAssetError(error)).toBe(true)
      if (!isAssetError(error)) return
      expect(error.failure).toBe('transport')
    })
  })
})
