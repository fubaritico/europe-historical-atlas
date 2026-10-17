import { describe, expect, it, vi } from 'vitest'

import { WIKIDATA_BATCH, createWikidataApiSource } from './wikidataSource'

/** A minimal item the reader accepts. */
const entity = (id: string) => ({ id, labels: { en: { language: 'en', value: id } }, claims: {} })

/** A fetch stub answering with the bodies given, in order, recording the URLs asked. */
function stubFetch(...bodies: { status?: number; body: unknown }[]) {
  const urls: string[] = []
  let call = 0
  const fetchStub = vi.fn((url: string) => {
    urls.push(url)
    const next = bodies[Math.min(call, bodies.length - 1)]
    call += 1
    return Promise.resolve(
      new Response(JSON.stringify(next?.body ?? {}), { status: next?.status ?? 200 })
    )
  })
  return { fetch: fetchStub as unknown as typeof fetch, urls }
}

/** The ids a recorded URL asked for. */
const idsOf = (url: string | undefined) =>
  new URL(url ?? 'https://x/').searchParams.get('ids')?.split('|')

describe('createWikidataApiSource', () => {
  describe('happy path', () => {
    it('reads several items in one request and returns their facts', async () => {
      const { fetch, urls } = stubFetch({
        body: { entities: { Q1: entity('Q1'), Q2: entity('Q2') } },
      })

      const answer = await createWikidataApiSource({ fetch, endpoint: 'https://w/api' }).read([
        'Q1',
        'Q2',
      ])

      expect([...answer.found.keys()]).toEqual(['Q1', 'Q2'])
      expect(answer.unknown).toEqual([])
      expect(idsOf(urls[0])).toEqual(['Q1', 'Q2'])
    })

    it('asks anonymously, with CORS open, for labels, claims and articles only', async () => {
      const { fetch, urls } = stubFetch({ body: { entities: { Q1: entity('Q1') } } })

      await createWikidataApiSource({ fetch, endpoint: 'https://w/api' }).read(['Q1'])

      const params = new URL(urls[0] ?? '').searchParams
      expect(params.get('origin')).toBe('*')
      expect(params.get('props')).toBe('labels|claims|sitelinks')
      expect(params.get('action')).toBe('wbgetentities')
    })
  })

  describe('variants', () => {
    it('drops the id an unknown-entity error names and asks again for the others', async () => {
      // Measured 2026-10-17: one unknown id fails the whole batch.
      const { fetch, urls } = stubFetch(
        { body: { error: { code: 'no-such-entity', id: 'Q9' } } },
        { body: { entities: { Q1: entity('Q1') } } }
      )

      const answer = await createWikidataApiSource({ fetch, endpoint: 'https://w/api' }).read([
        'Q1',
        'Q9',
      ])

      expect([...answer.found.keys()]).toEqual(['Q1'])
      expect(answer.unknown).toEqual(['Q9'])
      expect(idsOf(urls[1])).toEqual(['Q1'])
    })

    it('splits more ids than one request takes into several', async () => {
      const ids = Array.from({ length: WIKIDATA_BATCH + 3 }, (_, i) => `Q${String(i + 1)}`)
      const { fetch, urls } = stubFetch({ body: { entities: {} } })

      await createWikidataApiSource({ fetch, endpoint: 'https://w/api' }).read(ids)

      expect(urls).toHaveLength(2)
      expect(idsOf(urls[1])).toHaveLength(3)
    })

    it('reports a malformed id unknown without sending it, and sends nothing when none is valid', async () => {
      const { fetch, urls } = stubFetch({ body: { entities: {} } })

      const answer = await createWikidataApiSource({ fetch, endpoint: 'https://w/api' }).read([
        'Mosul',
        'q12',
      ])

      expect(answer.unknown).toEqual(['Mosul', 'q12'])
      expect(urls).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('rejects naming the status when the API answers an HTTP error', async () => {
      const { fetch } = stubFetch({ status: 503, body: {} })

      await expect(
        createWikidataApiSource({ fetch, endpoint: 'https://w/api' }).read(['Q1'])
      ).rejects.toThrow('Wikidata answered HTTP 503')
    })

    it('rejects an error that is not an unknown entity, naming its code', async () => {
      const { fetch } = stubFetch({ body: { error: { code: 'maxlag' } } })

      await expect(
        createWikidataApiSource({ fetch, endpoint: 'https://w/api' }).read(['Q1'])
      ).rejects.toThrow('Wikidata refused the request (maxlag)')
    })
  })

  describe('unmanaged errors', () => {
    it('rejects an answer without entities', async () => {
      const { fetch } = stubFetch({ body: { success: 1 } })

      await expect(
        createWikidataApiSource({ fetch, endpoint: 'https://w/api' }).read(['Q1'])
      ).rejects.toThrow('Wikidata answered without entities')
    })

    it('rejects when the network fails', async () => {
      const fetch = vi.fn(() =>
        Promise.reject(new TypeError('Failed to fetch'))
      ) as unknown as typeof globalThis.fetch

      await expect(
        createWikidataApiSource({ fetch, endpoint: 'https://w/api' }).read(['Q1'])
      ).rejects.toThrow('Failed to fetch')
    })
  })

  describe('edge cases', () => {
    it('asks once for an id given twice', async () => {
      const { fetch, urls } = stubFetch({ body: { entities: { Q1: entity('Q1') } } })

      await createWikidataApiSource({ fetch, endpoint: 'https://w/api' }).read(['Q1', 'Q1'])

      expect(idsOf(urls[0])).toEqual(['Q1'])
    })

    it('stops asking when every id of a batch turned out unknown', async () => {
      const { fetch, urls } = stubFetch({ body: { error: { code: 'no-such-entity', id: 'Q9' } } })

      const answer = await createWikidataApiSource({ fetch, endpoint: 'https://w/api' }).read([
        'Q9',
      ])

      expect(answer.unknown).toEqual(['Q9'])
      expect(urls).toHaveLength(1)
    })
  })
})
