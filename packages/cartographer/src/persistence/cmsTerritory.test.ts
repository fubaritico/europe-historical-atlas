import { describe, expect, it, vi } from 'vitest'

import { createCmsTerritoryClient, territoryAddedOf } from './cmsTerritory'

import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/** The County of Tripoli, as the form sends it. */
const TRIPOLI = {
  name: 'comté de Tripoli',
  nameEn: 'County of Tripoli',
  kind: 'county',
  wikidata: 'Q272033',
  existsFrom: 1102,
  existsTo: 1289,
}

describe('territoryAddedOf', () => {
  describe('happy path', () => {
    it('reads a territory created', () => {
      expect(territoryAddedOf(200, { id: 512, created: true })).toEqual({
        kind: 'linked',
        id: 512,
        created: true,
      })
    })
  })

  describe('variants', () => {
    it('reads a territory found', () => {
      expect(territoryAddedOf(200, { id: 42, created: false })).toEqual({
        kind: 'linked',
        id: 42,
        created: false,
      })
    })
  })

  describe('managed errors', () => {
    it('reads 503 as the CMS not started', () => {
      expect(territoryAddedOf(503, { reason: 'the CMS does not answer' })).toEqual({
        kind: 'offline',
      })
    })

    it('reads 401 as nobody signed in, or a session the CMS refused', () => {
      expect(territoryAddedOf(401, { reason: 'nobody is signed in to the CMS' })).toEqual({
        kind: 'signedOut',
      })
    })

    it('reads a refusal in its words', () => {
      expect(territoryAddedOf(502, { reason: 'Nom requis' })).toEqual({
        kind: 'refused',
        reason: 'Nom requis',
      })
    })
  })

  describe('unmanaged errors', () => {
    it('says the status of an answer that is not JSON', () => {
      expect(territoryAddedOf(404, null)).toEqual({
        kind: 'refused',
        reason: 'the dev server answered HTTP 404',
      })
    })
  })

  describe('edge cases', () => {
    it('does not take a 200 without a number for a territory', () => {
      expect(territoryAddedOf(200, { created: true }).kind).toBe('refused')
    })
  })
})

describe('createCmsTerritoryClient', () => {
  describe('happy path', () => {
    it('posts the territory to the route and reads the answer', async () => {
      const fetchFile = vi.fn<FetchLike>(() =>
        Promise.resolve(Response.json({ id: 512, created: true }))
      )
      const added = await createCmsTerritoryClient('/__cms/territories', fetchFile).add(TRIPOLI)
      expect(added).toEqual({ kind: 'linked', id: 512, created: true })
      const [url, init] = fetchFile.mock.calls[0] ?? []
      expect(url).toBe('/__cms/territories')
      expect(init?.method).toBe('POST')
      expect(JSON.parse(init?.body as string)).toEqual(TRIPOLI)
    })
  })

  describe('unmanaged errors', () => {
    it('lets a dev server gone through, for the dialogue to say', async () => {
      const fetchFile = vi.fn<FetchLike>(() => Promise.reject(new TypeError('Failed to fetch')))
      await expect(createCmsTerritoryClient('/r', fetchFile).add(TRIPOLI)).rejects.toThrow(
        'Failed to fetch'
      )
    })
  })

  // L2, L3, L5: the answers are read by territoryAddedOf, tested above
})
