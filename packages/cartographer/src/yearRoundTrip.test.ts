import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { moveAnchors } from '@europe-historical-atlas/core/editor/documentEdits'
import {
  firstSharedAnchor,
  ringOf,
  sharedBorderDocument,
} from '@europe-historical-atlas/core/editor/documentFixtures'

import { handleYearWrite } from './devServer/yearWriteEndpoint'
import { createDevServerYearArchive } from './persistence/yearArchive'

import type { YearFolder } from './devServer/diskFolder'

/** The manifest as committed today. */
const MANIFEST = JSON.stringify({
  version: 1,
  bbox: { west: -45, south: 11, east: 78.75, north: 76.84 },
  years: [],
})

/**
 * A dev server in memory: GETs read `years/` out of a map, PUTs go through the real endpoint into it.
 *
 * **The real endpoint, not a stand-in**, so the round trip below crosses exactly what a save crosses in the
 * browser — the client's serialisation, the server's checks, the files as laid out on disk, and the client's
 * reading back. Only the network and the disk are replaced.
 */
function devServer() {
  const disk = new Map<string, string>([['index.json', MANIFEST]])
  const folder: YearFolder = {
    read: (path) => disk.get(path) ?? null,
    modifiedAt: (path) => (disk.has(path) ? 0 : null),
    write: (path, text) => disk.set(path, text),
    rename: (from, to) => {
      disk.set(to, disk.get(from) ?? '')
      disk.delete(from)
    },
    // The folders at the root: the first segment of every path that has one.
    listFolders: () => [
      ...new Set(
        [...disk.keys()]
          .filter((path) => path.includes('/'))
          .map((path) => path.split('/')[0] ?? '')
      ),
    ],
  }
  const requests: { url: string; init: RequestInit | undefined }[] = []
  const fetchStub = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    // The archive sends a path and a JSON string; anything else is a change worth failing on.
    if (typeof input !== 'string') throw new Error('the archive should fetch a path')
    const url = input
    requests.push({ url, init })
    const served = answerEndpoint(url, init, folder)
    if (served !== null) return Promise.resolve(served)
    const text = disk.get(url.replace(/^\/years\//, ''))
    return Promise.resolve(
      text === undefined ? new Response('', { status: 404 }) : new Response(text)
    )
  })
  const archive = createDevServerYearArchive({
    fetch: fetchStub,
    yearsBase: '/years',
    writeRoute: '/__years',
  })
  return { archive, disk, requests, fetchStub }
}

/**
 * The dev server's answer to a list or a save, through the real endpoint — or `null` for any other request.
 * @param url - the path asked
 * @param init - the request's options
 * @param folder - the years folder in memory
 * @returns the response, or `null`
 */
function answerEndpoint(
  url: string,
  init: RequestInit | undefined,
  folder: YearFolder
): Response | null {
  const method = init?.method ?? 'GET'
  if (url === '/__years' && method === 'GET') {
    const response = handleYearWrite(
      { method: 'GET', path: '', host: 'localhost:5174', origin: undefined, body: '' },
      folder
    )
    return new Response(response.body, { status: response.status })
  }
  if (!url.startsWith('/__years') || method !== 'PUT') return null
  if (typeof init?.body !== 'string')
    throw new Error('the archive should send its files as JSON text')
  const response = handleYearWrite(
    {
      method: 'PUT',
      path: decodeURIComponent(url.slice('/__years'.length)),
      host: 'localhost:5174',
      origin: 'http://localhost:5174',
      ifMatch: new Headers(init.headers).get('if-match') ?? undefined,
      body: init.body,
    },
    folder
  )
  return new Response(response.body, { status: response.status })
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

/*
 * The dev-server archive (`persistence/yearArchive.ts`) against the real write endpoint
 * (`devServer/yearWriteEndpoint.ts`) — `s04`'s round trip, end to end but for the network and the disk.
 * At the root of `src/` because it is the one suite allowed to hold both sides: `persistence/` and
 * `devServer/` may not import each other, which is the boundary the online tier depends on.
 */
describe('createDevServerYearArchive', () => {
  describe('happy path', () => {
    it('reopens a saved year identical to what was saved', async () => {
      const { archive } = devServer()
      const document = sharedBorderDocument()
      await archive.save(document, '1100')

      expect(await archive.open('1100')).toEqual(document)
    })

    it('reopens a saved year with its shared anchors still shared, not duplicated', async () => {
      // `s04`: *"stretches shared by two polities are still shared"*. Equal coordinates would pass a
      // naive save that gave each polity its own copy of its points; moving one anchor tells them apart.
      const { archive } = devServer()
      await archive.save(sharedBorderDocument(), '1100')
      const reopened = await archive.open('1100')
      const shared = firstSharedAnchor(reopened)
      moveAnchors(reopened, [{ index: shared, to: [3, 47] }])

      expect(ringOf(reopened, 'fr-couronne')).toContainEqual([3, 47])
      expect(ringOf(reopened, 'hre')).toContainEqual([3, 47])
    })

    it('reports what it saved — the map, its polities and its vertices', async () => {
      const { archive } = devServer()

      expect(await archive.save(sharedBorderDocument(), '1100')).toEqual({
        map: '1100',
        polities: 2,
        vertices: 6,
      })
    })

    it('saves twice over a year it opened, each save conditional on the stamp the last one answered', async () => {
      const { archive, requests } = devServer()
      await archive.save(sharedBorderDocument(), '1100')
      const reopened = await archive.open('1100')
      await archive.save(reopened, '1100')
      await archive.save(reopened, '1100')
      const puts = requests.filter((request) => request.init?.method === 'PUT')

      // The first save expects the year absent (it never read it), the next ones the stamp answered.
      expect(puts.map((put) => new Headers(put.init?.headers).has('if-match'))).toEqual([
        true,
        true,
        true,
      ])
    })

    it('lists the year in the manifest once saved, and the map among the maps', async () => {
      const { archive, disk } = devServer()
      await archive.save(sharedBorderDocument(), '1100')

      expect((JSON.parse(disk.get('index.json') ?? '{}') as { years: number[] }).years).toEqual([
        1100,
      ])
      expect(await archive.listMaps()).toEqual(['1100'])
    })
  })

  describe('variants', () => {
    // s19: a map is a folder, and its name is the folder's.
    it('saves a working map under its own folder, lists it, and leaves the manifest alone', async () => {
      const { archive, disk } = devServer()
      const document = sharedBorderDocument()
      await archive.save(document, '1100-backup-2026-11-02')

      expect(disk.has('1100-backup-2026-11-02/registry.json')).toBe(true)
      expect(disk.get('index.json')).toBe(MANIFEST)
      expect(await archive.listMaps()).toEqual(['1100-backup-2026-11-02'])
      expect(await archive.open('1100-backup-2026-11-02')).toEqual(document)
    })

    it('lists every map in the order of their names', async () => {
      const { archive } = devServer()
      await archive.save(sharedBorderDocument(), '1100')
      await archive.save(sharedBorderDocument(), '1100.copy.2026-11-02T18-30-12')
      await archive.save(sharedBorderDocument(), '1100-backup')

      expect(await archive.listMaps()).toEqual([
        '1100',
        '1100-backup',
        '1100.copy.2026-11-02T18-30-12',
      ])
    })

    it('drops anchors nothing holds any more when saving, and reports the count written', async () => {
      const { archive } = devServer()
      const document = sharedBorderDocument()
      document.anchors.push([10, 10])
      document.anchorSource.push(0)

      expect((await archive.save(document, '1100')).vertices).toBe(6)
    })

    it('reads every file without the cache, so a reopen after a save sees that save', async () => {
      const { archive, requests } = devServer()
      await archive.save(sharedBorderDocument(), '1100')
      await archive.open('1100')
      const reads = requests.filter((request) => request.init?.method !== 'PUT')

      expect(reads.length).toBeGreaterThan(0)
      expect(reads.every((request) => request.init?.cache === 'no-store')).toBe(true)
    })
  })

  describe('managed errors', () => {
    // s19: a folder named 1200 holding 1100 would be published by the atlas as 1200.
    it('refuses to save a map of 1100 under the name of another year, writing nothing', async () => {
      const { archive, disk } = devServer()

      await expect(archive.save(sharedBorderDocument(), '1200')).rejects.toThrow(
        /A map named 1200 is the map of the year 1200.*this map is 1100/
      )
      expect([...disk.keys()]).toEqual(['index.json'])
    })

    it('refuses a name that cannot be a folder’s, writing nothing', async () => {
      const { archive, disk } = devServer()

      await expect(archive.save(sharedBorderDocument(), '../escape')).rejects.toThrow(
        /not a map's name/
      )
      expect([...disk.keys()]).toEqual(['index.json'])
    })

    it('refuses to open a year whose files are absent, as a transport failure naming the file', async () => {
      const { archive } = devServer()

      await expect(archive.open('1100')).rejects.toThrow(
        /transport.*\/years\/1100\/registry\.json.*HTTP 404/
      )
    })

    it('carries the server’s reason when it refuses a save', async () => {
      const { archive } = devServer()
      const document = sharedBorderDocument()
      document.polities[0] = {
        ...document.polities[0],
        id: '',
      } as (typeof document.polities)[number]

      await expect(archive.save(document, '1100')).rejects.toThrow(/polities\[0\]\.id/)
    })

    it('refuses a save over a year another writer changed after it was opened', async () => {
      const { archive, disk } = devServer()
      await archive.save(sharedBorderDocument(), '1100')
      const reopened = await archive.open('1100')
      disk.set('1100/registry.json', `${disk.get('1100/registry.json') ?? ''}\n`)

      await expect(archive.save(reopened, '1100')).rejects.toMatchObject({
        name: 'YearChangedOnDisk',
        map: '1100',
        changedAt: 0,
      })
    })

    // ARCH-002: the page never read 1100, and something wrote it meanwhile — asked, not saved over.
    it('refuses the first save of a year that appeared on disk after the page started', async () => {
      const { archive, fetchStub } = devServer()
      // Another page on the same server — another writer the first page never heard of.
      const other = createDevServerYearArchive({
        fetch: fetchStub,
        yearsBase: '/years',
        writeRoute: '/__years',
      })
      await other.save(sharedBorderDocument(), '1100')

      await expect(archive.save(sharedBorderDocument(), '1100')).rejects.toMatchObject({
        name: 'YearChangedOnDisk',
        map: '1100',
      })
    })

    it('refuses to open three files that disagree', async () => {
      const { archive, disk } = devServer()
      await archive.save(sharedBorderDocument(), '1100')
      const borders = JSON.parse(disk.get('1100/borders.json') ?? '{}') as { year: number }
      disk.set('1100/borders.json', JSON.stringify({ ...borders, year: 1101 }))

      await expect(archive.open('1100')).rejects.toThrow(/consistency/)
    })
  })

  describe('unmanaged errors', () => {
    it('falls back to the status when a refusal carries no readable reason', async () => {
      const archive = createDevServerYearArchive({
        fetch: () => Promise.resolve(new Response('<html>proxy error</html>', { status: 502 })),
        yearsBase: '/years',
        writeRoute: '/__years',
      })

      await expect(archive.save(sharedBorderDocument(), '1100')).rejects.toThrow('HTTP 502')
    })

    it('lets a network failure through as it is', async () => {
      const archive = createDevServerYearArchive({
        fetch: () => Promise.reject(new TypeError('Failed to fetch')),
        yearsBase: '/years',
        writeRoute: '/__years',
      })

      await expect(archive.save(sharedBorderDocument(), '1100')).rejects.toThrow('Failed to fetch')
    })
  })

  describe('edge cases', () => {
    it('reads a map from a base given with a trailing slash', async () => {
      const { archive: writer, fetchStub } = devServer()
      const document = sharedBorderDocument()
      await writer.save(document, '1100')
      const archive = createDevServerYearArchive({
        fetch: fetchStub,
        yearsBase: '/years/',
        writeRoute: '/__years',
      })

      expect(await archive.open('1100')).toEqual(document)
    })

    it('lists no map in an empty folder', async () => {
      const { archive } = devServer()

      expect(await archive.listMaps()).toEqual([])
    })

    it('saves and reopens a year with nothing drawn in it', async () => {
      const { archive } = devServer()
      const document = sharedBorderDocument()
      document.polities = []
      document.claims = []

      expect((await archive.open((await archive.save(document, '1100')).map)).anchors).toEqual([])
    })
  })
})
