import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CmsUnreachableError } from './cmsSession'
import { CmsRefusalError, CmsSessionRefusedError } from './cmsTerritories'
import { handleTerritoryRequest } from './cmsTerritoryEndpoint'

import type { CmsTerritories } from './cmsTerritories'
import type { EndpointRequest } from './httpEndpoint'

/** The County of Flanders, as the page sends it. */
const FLANDERS = JSON.stringify({
  name: 'Comté de Flandre',
  nameEn: 'County of Flanders',
  kind: 'county',
  wikidata: 'Q234598',
  existsFrom: 862,
  existsTo: null,
})

/**
 * A request from the Cartographer's own page.
 * @param fields - what to change
 * @returns the request
 */
function request(fields: Partial<EndpointRequest> = {}): EndpointRequest {
  return {
    method: 'POST',
    path: '/',
    host: 'localhost:5174',
    origin: 'http://localhost:5174',
    cookie: 'theme=dark; payload-token=session-token',
    body: FLANDERS,
    ...fields,
  }
}

/**
 * The CMS's territories as a stand-in.
 * @param found - what the search by Wikidata finds
 * @returns the stand-in
 */
function cms(found: number | null = null) {
  return {
    findByWikidata: vi.fn<CmsTerritories['findByWikidata']>(() => Promise.resolve(found)),
    create: vi.fn<CmsTerritories['create']>(() => Promise.resolve(7)),
    list: vi.fn<CmsTerritories['list']>(() => Promise.resolve([])),
  }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handleTerritoryRequest', () => {
  describe('happy path', () => {
    it('creates the territory and answers its number', async () => {
      const territories = cms()
      const response = await handleTerritoryRequest(request(), territories)
      expect(response).toEqual({ status: 200, body: '{"id":7,"created":true}' })
      expect(territories.findByWikidata).toHaveBeenCalledWith('session-token', 'Q234598')
      expect(territories.create).toHaveBeenCalledWith(
        'session-token',
        expect.objectContaining({ name: 'Comté de Flandre', wikidata: 'Q234598' })
      )
    })
  })

  describe('variants', () => {
    it('answers the territory the CMS already has, and creates nothing', async () => {
      const territories = cms(42)
      const response = await handleTerritoryRequest(request(), territories)
      expect(response).toEqual({ status: 200, body: '{"id":42,"created":false}' })
      expect(territories.create).not.toHaveBeenCalled()
    })
  })

  describe('managed errors', () => {
    it('says the CMS is not started', async () => {
      const territories = cms()
      territories.findByWikidata.mockRejectedValue(
        new CmsUnreachableError(new Error('ECONNREFUSED'))
      )
      expect(await handleTerritoryRequest(request(), territories)).toEqual({
        status: 503,
        body: '{"reason":"the CMS does not answer"}',
      })
    })

    it('hands back the CMS refusal in its words', async () => {
      const territories = cms()
      territories.create.mockRejectedValue(new CmsRefusalError('Nom requis'))
      expect(await handleTerritoryRequest(request(), territories)).toEqual({
        status: 502,
        body: '{"reason":"Nom requis"}',
      })
    })

    it('says nobody is signed in, and asks the CMS nothing', async () => {
      const territories = cms()
      expect(await handleTerritoryRequest(request({ cookie: 'theme=dark' }), territories)).toEqual({
        status: 401,
        body: '{"reason":"nobody is signed in to the CMS"}',
      })
      expect(territories.findByWikidata).not.toHaveBeenCalled()
    })

    it('says the CMS refused the session, as nobody signed in', async () => {
      const territories = cms()
      territories.create.mockRejectedValue(
        new CmsSessionRefusedError('You are not allowed to perform this action.')
      )
      expect(await handleTerritoryRequest(request(), territories)).toEqual({
        status: 401,
        body: '{"reason":"You are not allowed to perform this action."}',
      })
    })

    it('refuses a request that is not one, and asks the CMS nothing', async () => {
      const territories = cms()
      const response = await handleTerritoryRequest(request({ body: '{}' }), territories)
      expect(response.status).toBe(400)
      expect(territories.findByWikidata).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('lets an unexpected failure through, for the middleware to answer 500', async () => {
      const territories = cms()
      territories.create.mockRejectedValue(new Error('boom'))
      await expect(handleTerritoryRequest(request(), territories)).rejects.toThrow('boom')
    })
  })

  describe('edge cases', () => {
    it('refuses a page from another origin before anything', async () => {
      const territories = cms()
      const response = await handleTerritoryRequest(
        request({ origin: 'http://evil.example' }),
        territories
      )
      expect(response.status).toBe(403)
      expect(territories.findByWikidata).not.toHaveBeenCalled()
    })

    it('reads no session from a request with no cookie at all', async () => {
      const response = await handleTerritoryRequest(request({ cookie: undefined }), cms())
      expect(response.status).toBe(401)
    })

    it('refuses another method than GET and POST', async () => {
      expect((await handleTerritoryRequest(request({ method: 'DELETE' }), cms())).status).toBe(405)
    })
  })
})

/**
 * The page's listing as a browser sends it: a GET to its own origin carries no `Origin` (SEC-001 of the review).
 * @param fields - what to change
 * @returns the request
 */
const listing = (fields: Partial<EndpointRequest> = {}) =>
  request({ method: 'GET', body: '', origin: undefined, ...fields })

describe('handleTerritoryRequest, the listing (CARTO-568)', () => {
  const LEON = { id: 15, name: 'royaume de León', wikidata: 'Q199442', kind: 'kingdom' }
  describe('happy path', () => {
    it('answers every territory, read with the session', async () => {
      const territories = cms()
      territories.list.mockResolvedValue([LEON])

      const answered = await handleTerritoryRequest(listing(), territories)

      expect(answered.status).toBe(200)
      expect(JSON.parse(answered.body)).toEqual({ territories: [LEON] })
      expect(territories.list).toHaveBeenCalledWith('session-token')
      expect(territories.create).not.toHaveBeenCalled()
    })
  })

  describe('managed errors', () => {
    it('answers 401 when nobody is signed in, the CMS not asked', async () => {
      const territories = cms()

      const answered = await handleTerritoryRequest(listing({ cookie: 'theme=dark' }), territories)

      expect(answered.status).toBe(401)
      expect(territories.list).not.toHaveBeenCalled()
    })

    it('answers 503 when the CMS does not answer', async () => {
      const territories = cms()
      territories.list.mockRejectedValue(new CmsUnreachableError(new Error('ECONNREFUSED')))

      expect((await handleTerritoryRequest(listing(), territories)).status).toBe(503)
    })

    it('answers 401 when the CMS refuses the session', async () => {
      const territories = cms()
      territories.list.mockRejectedValue(new CmsSessionRefusedError('You are not allowed'))

      expect((await handleTerritoryRequest(listing(), territories)).status).toBe(401)
    })

    it('answers 502 with the reason when the list cannot be read, said on the console', async () => {
      const territories = cms()
      territories.list.mockRejectedValue(new CmsRefusalError('territory 4: no French name'))

      const answered = await handleTerritoryRequest(listing(), territories)

      expect(answered.status).toBe(502)
      expect(JSON.parse(answered.body)).toEqual({ reason: 'territory 4: no French name' })
      expect(console.warn).toHaveBeenCalledWith(
        '[Cartographer dev server] [Check this year]: the CMS refused (territory 4: no French name)'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('lets an unexpected failure through', async () => {
      const territories = cms()
      territories.list.mockRejectedValue(new TypeError('boom'))

      await expect(handleTerritoryRequest(listing(), territories)).rejects.toThrow('boom')
    })
  })

  describe('edge cases', () => {
    it('refuses a creation without an Origin, the relaxation the GET’s alone', async () => {
      const territories = cms()

      const answered = await handleTerritoryRequest(request({ origin: undefined }), territories)

      expect(answered.status).toBe(403)
      expect(territories.create).not.toHaveBeenCalled()
    })

    it('refuses a listing without an Origin to a host off the loopback', async () => {
      const answered = await handleTerritoryRequest(listing({ host: 'evil.example:5174' }), cms())

      expect(answered.status).toBe(403)
    })

    it('refuses a listing from another origin', async () => {
      const answered = await handleTerritoryRequest(
        listing({ origin: 'http://evil.example' }),
        cms()
      )

      expect(answered.status).toBe(403)
    })
  })
})
