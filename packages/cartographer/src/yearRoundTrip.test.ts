import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { moveAnchors } from '@europe-historical-atlas/core/editor/documentEdits'
import {
  firstSharedAnchor,
  ringOf,
  sharedBorderDocument,
} from '@europe-historical-atlas/core/editor/documentFixtures'

import { handleYearWrite } from './devServer/yearWriteEndpoint'
import { createDevServerYearArchive } from './persistence/yearArchive'

import type { DiskFolder } from './devServer/diskFolder'

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
  const folder: DiskFolder = {
    read: (path) => disk.get(path) ?? null,
    write: (path, text) => disk.set(path, text),
    rename: (from, to) => {
      disk.set(to, disk.get(from) ?? '')
      disk.delete(from)
    },
  }
  const requests: { url: string; init: RequestInit | undefined }[] = []
  const fetchStub = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    // The archive sends a path and a JSON string; anything else is a change worth failing on.
    if (typeof input !== 'string') throw new Error('the archive should fetch a path')
    const url = input
    requests.push({ url, init })
    if (url.startsWith('/__years') && init?.method === 'PUT') {
      if (typeof init.body !== 'string')
        throw new Error('the archive should send its files as JSON text')
      const response = handleYearWrite(
        {
          method: 'PUT',
          path: url.slice('/__years'.length),
          host: 'localhost:5174',
          origin: 'http://localhost:5174',
          body: init.body,
        },
        folder
      )
      return Promise.resolve(new Response(response.body, { status: response.status }))
    }
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
      await archive.save(document)

      expect(await archive.open(1100)).toEqual(document)
    })

    it('reopens a saved year with its shared anchors still shared, not duplicated', async () => {
      // `s04`: *"stretches shared by two polities are still shared"*. Equal coordinates would pass a
      // naive save that gave each polity its own copy of its points; moving one anchor tells them apart.
      const { archive } = devServer()
      await archive.save(sharedBorderDocument())
      const reopened = await archive.open(1100)
      const shared = firstSharedAnchor(reopened)
      moveAnchors(reopened, [{ index: shared, to: [3, 47] }])

      expect(ringOf(reopened, 'fr-couronne')).toContainEqual([3, 47])
      expect(ringOf(reopened, 'hre')).toContainEqual([3, 47])
    })

    it('reports what it saved — the year, its polities and its vertices', async () => {
      const { archive } = devServer()

      expect(await archive.save(sharedBorderDocument())).toEqual({
        year: 1100,
        polities: 2,
        vertices: 6,
      })
    })

    it('lists the year in the manifest once saved', async () => {
      const { archive } = devServer()
      await archive.save(sharedBorderDocument())

      expect(await archive.listedYears()).toEqual([1100])
    })
  })

  describe('variants', () => {
    it('drops anchors nothing holds any more when saving, and reports the count written', async () => {
      const { archive } = devServer()
      const document = sharedBorderDocument()
      document.anchors.push([10, 10])
      document.anchorSource.push(0)

      expect((await archive.save(document)).vertices).toBe(6)
    })

    it('reads every file without the cache, so a reopen after a save sees that save', async () => {
      const { archive, requests } = devServer()
      await archive.save(sharedBorderDocument())
      await archive.open(1100)
      const reads = requests.filter((request) => request.init?.method !== 'PUT')

      expect(reads.length).toBeGreaterThan(0)
      expect(reads.every((request) => request.init?.cache === 'no-store')).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('refuses to open a year whose files are absent, as a transport failure naming the file', async () => {
      const { archive } = devServer()

      await expect(archive.open(1100)).rejects.toThrow(
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

      await expect(archive.save(document)).rejects.toThrow(/polities\[0\]\.id/)
    })

    it('refuses to open three files that disagree', async () => {
      const { archive, disk } = devServer()
      await archive.save(sharedBorderDocument())
      const borders = JSON.parse(disk.get('1100/borders.json') ?? '{}') as { year: number }
      disk.set('1100/borders.json', JSON.stringify({ ...borders, year: 1101 }))

      await expect(archive.open(1100)).rejects.toThrow(/consistency/)
    })
  })

  describe('unmanaged errors', () => {
    it('falls back to the status when a refusal carries no readable reason', async () => {
      const archive = createDevServerYearArchive({
        fetch: () => Promise.resolve(new Response('<html>proxy error</html>', { status: 502 })),
        yearsBase: '/years',
        writeRoute: '/__years',
      })

      await expect(archive.save(sharedBorderDocument())).rejects.toThrow('HTTP 502')
    })

    it('lets a network failure through as it is', async () => {
      const archive = createDevServerYearArchive({
        fetch: () => Promise.reject(new TypeError('Failed to fetch')),
        yearsBase: '/years',
        writeRoute: '/__years',
      })

      await expect(archive.save(sharedBorderDocument())).rejects.toThrow('Failed to fetch')
    })
  })

  describe('edge cases', () => {
    it('reads the manifest from a base given with a trailing slash', async () => {
      const { fetchStub } = devServer()
      const archive = createDevServerYearArchive({
        fetch: fetchStub,
        yearsBase: '/years/',
        writeRoute: '/__years',
      })

      expect(await archive.listedYears()).toEqual([])
    })

    it('saves and reopens a year with nothing drawn in it', async () => {
      const { archive } = devServer()
      const document = sharedBorderDocument()
      document.polities = []
      document.claims = []

      expect((await archive.open((await archive.save(document)).year)).anchors).toEqual([])
    })
  })
})
