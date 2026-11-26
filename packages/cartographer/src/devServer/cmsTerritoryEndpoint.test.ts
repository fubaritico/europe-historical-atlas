import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CmsUnreachableError } from './cmsSession'
import { CmsRefusalError, CmsSessionRefusedError } from './cmsTerritories'
import { handleTerritoryCreation } from './cmsTerritoryEndpoint'

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
  }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handleTerritoryCreation', () => {
  describe('happy path', () => {
    it('creates the territory and answers its number', async () => {
      const territories = cms()
      const response = await handleTerritoryCreation(request(), territories)
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
      const response = await handleTerritoryCreation(request(), territories)
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
      expect(await handleTerritoryCreation(request(), territories)).toEqual({
        status: 503,
        body: '{"reason":"the CMS does not answer"}',
      })
    })

    it('hands back the CMS refusal in its words', async () => {
      const territories = cms()
      territories.create.mockRejectedValue(new CmsRefusalError('Nom requis'))
      expect(await handleTerritoryCreation(request(), territories)).toEqual({
        status: 502,
        body: '{"reason":"Nom requis"}',
      })
    })

    it('says nobody is signed in, and asks the CMS nothing', async () => {
      const territories = cms()
      expect(await handleTerritoryCreation(request({ cookie: 'theme=dark' }), territories)).toEqual(
        { status: 401, body: '{"reason":"nobody is signed in to the CMS"}' }
      )
      expect(territories.findByWikidata).not.toHaveBeenCalled()
    })

    it('says the CMS refused the session, as nobody signed in', async () => {
      const territories = cms()
      territories.create.mockRejectedValue(
        new CmsSessionRefusedError('You are not allowed to perform this action.')
      )
      expect(await handleTerritoryCreation(request(), territories)).toEqual({
        status: 401,
        body: '{"reason":"You are not allowed to perform this action."}',
      })
    })

    it('refuses a request that is not one, and asks the CMS nothing', async () => {
      const territories = cms()
      const response = await handleTerritoryCreation(request({ body: '{}' }), territories)
      expect(response.status).toBe(400)
      expect(territories.findByWikidata).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('lets an unexpected failure through, for the middleware to answer 500', async () => {
      const territories = cms()
      territories.create.mockRejectedValue(new Error('boom'))
      await expect(handleTerritoryCreation(request(), territories)).rejects.toThrow('boom')
    })
  })

  describe('edge cases', () => {
    it('refuses a page from another origin before anything', async () => {
      const territories = cms()
      const response = await handleTerritoryCreation(
        request({ origin: 'http://evil.example' }),
        territories
      )
      expect(response.status).toBe(403)
      expect(territories.findByWikidata).not.toHaveBeenCalled()
    })

    it('reads no session from a request with no cookie at all', async () => {
      const response = await handleTerritoryCreation(request({ cookie: undefined }), cms())
      expect(response.status).toBe(401)
    })

    it('refuses another method than POST', async () => {
      expect((await handleTerritoryCreation(request({ method: 'GET' }), cms())).status).toBe(405)
    })
  })
})
