import { describe, expect, it, vi } from 'vitest'

import { createDevServerDraftStore } from './draftStore'

/** A fetch stub answering every call with one response, recording the calls. */
function stubFetch(status: number, body: unknown = {}) {
  const calls: { url: string; init: RequestInit | undefined }[] = []
  const fetchStub = vi.fn((url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return Promise.resolve(new Response(JSON.stringify(body), { status }))
  })
  return { fetch: fetchStub as unknown as typeof fetch, calls }
}

/** A well-formed draft of 1100. */
const DRAFT = { year: 1100, savedAt: '2026-10-17T15:42:05.000Z', files: { registry: {} } }

describe('createDevServerDraftStore', () => {
  describe('happy path', () => {
    it('PUTs a draft as JSON to the route and the year', async () => {
      const { fetch, calls } = stubFetch(200)

      await createDevServerDraftStore({ fetch, route: '/__drafts' }).write(DRAFT)

      expect(calls[0]?.url).toBe('/__drafts/1100')
      expect(calls[0]?.init?.method).toBe('PUT')
      expect(
        JSON.parse(typeof calls[0]?.init?.body === 'string' ? calls[0].init.body : '')
      ).toEqual(DRAFT)
    })

    it('reads a draft back, bypassing any cache', async () => {
      const { fetch, calls } = stubFetch(200, DRAFT)

      const draft = await createDevServerDraftStore({ fetch, route: '/__drafts' }).read(1100)

      expect(draft).toEqual(DRAFT)
      expect(calls[0]?.init?.cache).toBe('no-store')
    })
  })

  describe('variants', () => {
    it('answers null when there is no draft', async () => {
      const { fetch } = stubFetch(404, { reason: 'there is no draft of 1100' })

      expect(await createDevServerDraftStore({ fetch, route: '/__drafts' }).read(1100)).toBeNull()
    })

    it('DELETEs to remove and POSTs to set aside', async () => {
      const { fetch, calls } = stubFetch(200)
      const drafts = createDevServerDraftStore({ fetch, route: '/__drafts' })

      await drafts.remove(1100)
      await drafts.setAside(1100)

      expect(calls.map((call) => `${String(call.init?.method)} ${call.url}`)).toEqual([
        'DELETE /__drafts/1100',
        'POST /__drafts/1100/set-aside',
      ])
    })

    // CARTO-238 rung 2a: the hourly snapshot travels as a draft does, to its own path.
    it('POSTs a snapshot as JSON to the year and /snapshot', async () => {
      const { fetch, calls } = stubFetch(200)

      await createDevServerDraftStore({ fetch, route: '/__drafts' }).snapshot(DRAFT)

      expect(`${String(calls[0]?.init?.method)} ${String(calls[0]?.url)}`).toBe(
        'POST /__drafts/1100/snapshot'
      )
      expect(
        JSON.parse(typeof calls[0]?.init?.body === 'string' ? calls[0].init.body : '')
      ).toEqual(DRAFT)
    })
  })

  describe('managed errors', () => {
    it('rejects with the reason the server gave', async () => {
      const { fetch } = stubFetch(403, {
        reason: 'only the Cartographer served by this machine may keep drafts',
      })

      await expect(
        createDevServerDraftStore({ fetch, route: '/__drafts' }).write(DRAFT)
      ).rejects.toThrow('only the Cartographer served by this machine may keep drafts')
    })
  })

  describe('unmanaged errors', () => {
    it('rejects a body that is not a draft, naming what it lacks', async () => {
      const { fetch } = stubFetch(200, { year: 1100 })

      await expect(
        createDevServerDraftStore({ fetch, route: '/__drafts' }).read(1100)
      ).rejects.toThrow(
        'the draft of 1100 is not a draft — it lacks its year, its time or its files'
      )
    })

    it('rejects when the network fails', async () => {
      const fetch = vi.fn(() =>
        Promise.reject(new TypeError('Failed to fetch'))
      ) as unknown as typeof globalThis.fetch

      await expect(
        createDevServerDraftStore({ fetch, route: '/__drafts' }).remove(1100)
      ).rejects.toThrow('Failed to fetch')
    })
  })

  describe('edge cases', () => {
    it('rejects a draft that says it is of another year', async () => {
      const { fetch } = stubFetch(200, { ...DRAFT, year: 1200 })

      await expect(
        createDevServerDraftStore({ fetch, route: '/__drafts' }).read(1100)
      ).rejects.toThrow('the draft of 1100 says it is of year 1200')
    })
  })
})

/** Two snapshots of 1100, newest first, as the endpoint lists them. */
const SNAPSHOTS = [
  { name: '1100.2026-10-18T15-00-00Z.json', takenAt: '2026-10-18T15:00:00Z' },
  { name: '1100.2026-10-18T14-00-00Z.json', takenAt: '2026-10-18T14:00:00Z' },
]

describe('createDevServerDraftStore, reading the snapshots back (CARTO-238, rung 2b)', () => {
  describe('happy path', () => {
    it('GETs the list from /<year>/snapshots, bypassing any cache, and returns its entries', async () => {
      const { fetch, calls } = stubFetch(200, { year: 1100, snapshots: SNAPSHOTS })

      const listed = await createDevServerDraftStore({
        fetch,
        route: '/__drafts',
      }).listSnapshots(1100)

      expect(listed).toEqual(SNAPSHOTS)
      expect(calls[0]?.url).toBe('/__drafts/1100/snapshots')
      expect(calls[0]?.init?.method).toBeUndefined()
      expect(calls[0]?.init?.cache).toBe('no-store')
    })

    it('GETs one snapshot by its name, bypassing any cache, and returns it as a draft', async () => {
      const { fetch, calls } = stubFetch(200, DRAFT)

      const snapshot = await createDevServerDraftStore({
        fetch,
        route: '/__drafts',
      }).readSnapshot(1100, '1100.2026-10-18T14-00-00Z.json')

      expect(snapshot).toEqual(DRAFT)
      expect(calls[0]?.url).toBe('/__drafts/1100/snapshots/1100.2026-10-18T14-00-00Z.json')
      expect(calls[0]?.init?.cache).toBe('no-store')
    })
  })

  describe('variants', () => {
    it('returns an empty list when no snapshot was kept', async () => {
      const { fetch } = stubFetch(200, { year: 1100, snapshots: [] })

      expect(
        await createDevServerDraftStore({ fetch, route: '/__drafts' }).listSnapshots(1100)
      ).toEqual([])
    })

    it('keeps only the name and the time of each entry', async () => {
      const { fetch } = stubFetch(200, {
        year: 1100,
        snapshots: [{ ...SNAPSHOTS[0], size: 3_000_000 }],
      })

      expect(
        await createDevServerDraftStore({ fetch, route: '/__drafts' }).listSnapshots(1100)
      ).toEqual([SNAPSHOTS[0]])
    })

    it('encodes a name that holds a slash, so it stays one segment of the path', async () => {
      const { fetch, calls } = stubFetch(200, DRAFT)

      await createDevServerDraftStore({ fetch, route: '/__drafts' }).readSnapshot(
        1100,
        '../years/1100'
      )

      expect(calls[0]?.url).toBe('/__drafts/1100/snapshots/..%2Fyears%2F1100')
    })
  })

  describe('managed errors', () => {
    it('rejects the list with the reason the server gave', async () => {
      const { fetch } = stubFetch(403, {
        reason: 'only the Cartographer served by this machine may keep drafts',
      })

      await expect(
        createDevServerDraftStore({ fetch, route: '/__drafts' }).listSnapshots(1100)
      ).rejects.toThrow('only the Cartographer served by this machine may keep drafts')
    })

    it('rejects an absent snapshot with the reason the server gave, rather than answering null', async () => {
      const { fetch } = stubFetch(404, {
        reason: 'there is no snapshot "1100.2026-10-18T14-00-00Z.json" of 1100',
      })

      await expect(
        createDevServerDraftStore({ fetch, route: '/__drafts' }).readSnapshot(
          1100,
          '1100.2026-10-18T14-00-00Z.json'
        )
      ).rejects.toThrow('there is no snapshot "1100.2026-10-18T14-00-00Z.json" of 1100')
    })
  })

  describe('unmanaged errors', () => {
    it.each([
      ['no list at all', { year: 1100 }],
      ['a list that is not an array', { year: 1100, snapshots: 'none' }],
      ['an entry without its time', { year: 1100, snapshots: [{ name: 'a.json' }] }],
      ['an entry whose name is not text', { year: 1100, snapshots: [{ name: 3, takenAt: 'x' }] }],
      ['null', null],
    ])('refuses an answer with %s, saying it is not a list', async (_case, body) => {
      const { fetch } = stubFetch(200, body)

      await expect(
        createDevServerDraftStore({ fetch, route: '/__drafts' }).listSnapshots(1100)
      ).rejects.toThrow('the snapshots of 1100 could not be read — the answer is not a list')
    })

    it('refuses a snapshot that is not a draft, naming what it lacks', async () => {
      const { fetch } = stubFetch(200, { year: 1100 })

      await expect(
        createDevServerDraftStore({ fetch, route: '/__drafts' }).readSnapshot(1100, 'a.json')
      ).rejects.toThrow(
        'the draft of 1100 is not a draft — it lacks its year, its time or its files'
      )
    })
  })

  describe('edge cases', () => {
    it('refuses a snapshot that says it is of another year', async () => {
      const { fetch } = stubFetch(200, { ...DRAFT, year: 1200 })

      await expect(
        createDevServerDraftStore({ fetch, route: '/__drafts' }).readSnapshot(1100, 'a.json')
      ).rejects.toThrow('the draft of 1100 says it is of year 1200')
    })
  })
})
