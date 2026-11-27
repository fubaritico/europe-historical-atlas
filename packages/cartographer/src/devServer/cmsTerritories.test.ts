import { describe, expect, it, vi } from 'vitest'

import { CmsUnreachableError } from './cmsSession'
import { CmsRefusalError, CmsSessionRefusedError, createCmsTerritories } from './cmsTerritories'

import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/** The CMS of the tests, its address with a trailing slash. */
const CMS_URL = 'http://127.0.0.1:3100/'

/** The session's token of the tests. */
const TOKEN = 'session-token'

/**
 * A CMS that answers every request the same.
 * @param status - its status
 * @param payload - its JSON
 * @returns the stand-in
 */
function cmsAnswering(status: number, payload: unknown) {
  return vi.fn<FetchLike>(() => Promise.resolve(Response.json(payload, { status })))
}

describe('createCmsTerritories', () => {
  describe('happy path', () => {
    it('finds a territory by its Wikidata item, with the session', async () => {
      const fetchFile = cmsAnswering(200, { docs: [{ id: 42 }] })
      expect(await createCmsTerritories(CMS_URL, fetchFile).findByWikidata(TOKEN, 'Q234598')).toBe(
        42
      )
      const [url, init] = fetchFile.mock.calls[0] ?? []
      const asked = new URL(url as string)
      expect(asked.origin + asked.pathname).toBe('http://127.0.0.1:3100/api/territories')
      expect(asked.searchParams.get('where[wikidata][equals]')).toBe('Q234598')
      expect(new Headers(init?.headers).get('Authorization')).toBe('JWT session-token')
    })

    it('creates a territory with the session and answers its number', async () => {
      const fetchFile = cmsAnswering(201, { doc: { id: 7 } })
      expect(await createCmsTerritories(CMS_URL, fetchFile).create(TOKEN, { name: 'X' })).toBe(7)
      const [, init] = fetchFile.mock.calls[0] ?? []
      expect(init?.method).toBe('POST')
      expect(init?.body).toBe('{"name":"X"}')
      expect(new Headers(init?.headers).get('Authorization')).toBe('JWT session-token')
    })

    it('bounds every call, the creation too', async () => {
      const fetchFile = cmsAnswering(201, { doc: { id: 7 } })
      await createCmsTerritories(CMS_URL, fetchFile).create(TOKEN, {})
      expect(fetchFile.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
    })
  })

  describe('variants', () => {
    it('finds nothing when the CMS has no such item', async () => {
      const territories = createCmsTerritories(CMS_URL, cmsAnswering(200, { docs: [] }))
      expect(await territories.findByWikidata(TOKEN, 'Q1')).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('says the CMS refused, in its own words', async () => {
      const territories = createCmsTerritories(
        CMS_URL,
        cmsAnswering(400, { errors: [{ message: 'Le champ suivant est invalide : Nom' }] })
      )
      await expect(territories.create(TOKEN, {})).rejects.toThrow(
        new CmsRefusalError('Le champ suivant est invalide : Nom')
      )
    })

    it('tells a session the CMS no longer knows (403) from a refusal', async () => {
      const territories = createCmsTerritories(
        CMS_URL,
        cmsAnswering(403, { errors: [{ message: 'You are not allowed to perform this action.' }] })
      )
      await expect(territories.create(TOKEN, {})).rejects.toThrow(
        new CmsSessionRefusedError('You are not allowed to perform this action.')
      )
    })

    it('reads a 401 as the session refused too, its status said when it has no sentence', async () => {
      const territories = createCmsTerritories(CMS_URL, cmsAnswering(401, null))
      await expect(territories.findByWikidata(TOKEN, 'Q1')).rejects.toThrow(
        new CmsSessionRefusedError('the CMS answered HTTP 401')
      )
    })
  })

  describe('unmanaged errors', () => {
    it('tells a CMS that does not answer from a refusal', async () => {
      const fetchFile = vi.fn<FetchLike>(() => Promise.reject(new TypeError('fetch failed')))
      await expect(
        createCmsTerritories(CMS_URL, fetchFile).findByWikidata(TOKEN, 'Q1')
      ).rejects.toThrow(CmsUnreachableError)
    })
  })

  describe('edge cases', () => {
    it('refuses a creation answered without a number', async () => {
      const territories = createCmsTerritories(CMS_URL, cmsAnswering(201, { doc: {} }))
      await expect(territories.create(TOKEN, {})).rejects.toThrow(
        'the CMS answered without a number'
      )
    })

    it('says the status of a refusal with no sentence', async () => {
      const territories = createCmsTerritories(CMS_URL, cmsAnswering(500, null))
      await expect(territories.findByWikidata(TOKEN, 'Q1')).rejects.toThrow(
        new CmsRefusalError('the CMS answered HTTP 500')
      )
    })
  })
})

describe('createCmsTerritories, the listing (CARTO-568)', () => {
  describe('happy path', () => {
    it('reads every territory in one page, with the session', async () => {
      const fetchFile = cmsAnswering(200, {
        docs: [{ id: 15, name: 'royaume de León', kind: 'kingdom', wikidata: 'Q199442' }],
      })

      const read = await createCmsTerritories(CMS_URL, fetchFile).list(TOKEN)

      expect(read.map(({ id, name }) => [id, name])).toEqual([[15, 'royaume de León']])
      const [url, init] = fetchFile.mock.calls[0] ?? []
      const asked = new URL(url as string)
      expect(asked.pathname).toBe('/api/territories')
      expect(asked.searchParams.get('pagination')).toBe('false')
      expect(new Headers(init?.headers).get('Authorization')).toBe('JWT session-token')
      expect(init?.signal).toBeInstanceOf(AbortSignal)
    })
  })

  describe('managed errors', () => {
    it('turns a list that cannot be read into a refusal, in its words', async () => {
      const territories = createCmsTerritories(
        CMS_URL,
        cmsAnswering(200, { docs: [{ id: 4, name: '', kind: 'county' }] })
      )

      await expect(territories.list(TOKEN)).rejects.toThrow(
        new CmsRefusalError('territory 4: no French name')
      )
    })

    it('tells the session refused from a refusal', async () => {
      const territories = createCmsTerritories(CMS_URL, cmsAnswering(403, null))

      await expect(territories.list(TOKEN)).rejects.toThrow(CmsSessionRefusedError)
    })
  })

  describe('unmanaged errors', () => {
    it('tells a CMS that does not answer', async () => {
      const fetchFile = vi.fn<FetchLike>(() => Promise.reject(new TypeError('fetch failed')))

      await expect(createCmsTerritories(CMS_URL, fetchFile).list(TOKEN)).rejects.toThrow(
        CmsUnreachableError
      )
    })
  })

  // L2, L5: the shapes of a territory are `territoryList`'s.
})
