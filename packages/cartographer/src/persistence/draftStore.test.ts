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
