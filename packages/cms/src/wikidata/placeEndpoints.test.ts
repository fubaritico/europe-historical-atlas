import { describe, expect, it, vi } from 'vitest'

import { fetchPlaceEntity, readPlace, searchPlaces } from './placeEndpoints'
import { WIKIDATA_USER_AGENT } from './wikidataPlace'

import type { LookupRequest } from './placeEndpoints'

const USER = { id: 1 } as unknown as LookupRequest['user']

/**
 * A request, signed in unless said.
 * @param over - what a test changes
 * @returns the request
 */
function request(over: Partial<LookupRequest> = {}): LookupRequest {
  return { user: USER, query: {}, routeParams: {}, ...over }
}

/**
 * A fetch answering one JSON body.
 * @param body - the body
 * @param ok - whether the answer is a success
 * @returns the stub
 */
function answering(body: unknown, ok = true) {
  return vi
    .fn()
    .mockResolvedValue({ ok, status: ok ? 200 : 503, json: () => Promise.resolve(body) })
}

describe('placeEndpoints', () => {
  describe('happy path', () => {
    it('answers the candidates of a name', async () => {
      const fetchFile = answering({ search: [{ id: 'Q90', label: 'Paris' }] })
      const response = await searchPlaces(request({ query: { name: 'Paris' } }), fetchFile)
      expect(await response.json()).toEqual([{ id: 'Q90', label: 'Paris', description: null }])
    })

    it('answers the place of an item', async () => {
      const body = { entities: { Q90: { id: 'Q90', labels: { fr: { value: 'Paris' } } } } }
      const response = await readPlace(request({ routeParams: { id: 'Q90' } }), answering(body))
      expect(await response.json()).toEqual({
        wikidata: 'Q90',
        name: 'Paris',
        coordinates: null,
        existsFrom: null,
        existsTo: null,
      })
    })
  })

  describe('variants', () => {
    it('introduces itself to Wikidata', async () => {
      const fetchFile = answering({ search: [] })
      await searchPlaces(request({ query: { name: 'Paris' } }), fetchFile)
      expect(fetchFile).toHaveBeenCalledWith(expect.any(String), {
        headers: { 'User-Agent': WIKIDATA_USER_AGENT },
      })
    })

    it('trims the name it searches', async () => {
      const fetchFile = answering({ search: [] })
      await searchPlaces(request({ query: { name: '  Paris ' } }), fetchFile)
      expect(String(fetchFile.mock.calls[0]?.[0])).toContain('search=Paris&')
    })
  })

  describe('managed errors', () => {
    it('refuses a visitor who is not signed in', async () => {
      const response = await searchPlaces(
        request({ user: null, query: { name: 'Paris' } }),
        answering({})
      )
      expect(response.status).toBe(401)
    })

    it('refuses an empty name without asking Wikidata', async () => {
      const fetchFile = answering({})
      const response = await searchPlaces(request({ query: { name: ' ' } }), fetchFile)
      expect([response.status, fetchFile.mock.calls.length]).toEqual([400, 0])
    })

    it('refuses a malformed id', async () => {
      const response = await readPlace(request({ routeParams: { id: 'Paris' } }), answering({}))
      expect(response.status).toBe(400)
    })

    it('says Wikidata does not answer when it fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const response = await searchPlaces(
        request({ query: { name: 'Paris' } }),
        answering({}, false)
      )
      expect([response.status, await response.json()]).toEqual([
        502,
        { error: 'Wikidata ne répond pas, réessayez.' },
      ])
    })
  })

  describe('unmanaged errors', () => {
    it('says Wikidata does not answer when the network throws', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const fetchFile = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
      const response = await readPlace(request({ routeParams: { id: 'Q90' } }), fetchFile)
      expect(response.status).toBe(502)
    })
  })

  describe('edge cases', () => {
    it('says Wikidata does not answer when its answer has another shape', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const response = await searchPlaces(
        request({ query: { name: 'Paris' } }),
        answering({ x: 1 })
      )
      expect(response.status).toBe(502)
    })
  })

  describe('fetchPlaceEntity — the seed’s way in', () => {
    it('reads the place of an item', async () => {
      const body = { entities: { Q90: { id: 'Q90', labels: { fr: { value: 'Paris' } } } } }
      const place = await fetchPlaceEntity('Q90', answering(body))
      expect(place).toMatchObject({ wikidata: 'Q90', name: 'Paris' })
    })

    it('throws the status rather than answering for the form', async () => {
      await expect(fetchPlaceEntity('Q90', answering({}, false))).rejects.toThrow('HTTP 503')
    })
  })
})
