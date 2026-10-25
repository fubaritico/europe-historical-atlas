import { describe, expect, it, vi } from 'vitest'

import { fetchCandidates, fetchPlace } from './lookupClient'

/**
 * A fetch answering one response.
 * @param status - its status
 * @param body - its JSON body
 * @returns the stub, typed as the browser's fetch
 */
function answering(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  })
}

describe('lookupClient', () => {
  describe('happy path', () => {
    it('answers the candidates', async () => {
      const candidates = [{ id: 'Q90', label: 'Paris', description: null }]
      expect(await fetchCandidates('Paris', answering(200, candidates))).toEqual({
        ok: true,
        data: candidates,
      })
    })
  })

  describe('variants', () => {
    it('asks our route with the name escaped, signed in', async () => {
      const fetchFile = answering(200, [])
      await fetchCandidates('Saint-Denis & co', fetchFile)
      expect(fetchFile).toHaveBeenCalledWith(
        '/api/places/wikidata-search?name=Saint-Denis%20%26%20co',
        { credentials: 'include' }
      )
    })

    it('asks the place of an item', async () => {
      const fetchFile = answering(200, { wikidata: 'Q90', name: 'Paris', coordinates: null })
      await fetchPlace('Q90', fetchFile)
      expect(fetchFile).toHaveBeenCalledWith('/api/places/wikidata/Q90', { credentials: 'include' })
    })
  })

  describe('managed errors', () => {
    it('passes on the route’s sentence', async () => {
      const answer = await fetchCandidates(
        'Paris',
        answering(502, { error: 'Wikidata ne répond pas, réessayez.' })
      )
      expect(answer).toEqual({ ok: false, message: 'Wikidata ne répond pas, réessayez.' })
    })
  })

  describe('unmanaged errors', () => {
    it('says the tool does not answer when the request throws', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const fetchFile = vi.fn().mockRejectedValue(new TypeError('down')) as unknown as typeof fetch
      expect(await fetchPlace('Q90', fetchFile)).toEqual({
        ok: false,
        message: 'L’outil de contribution ne répond pas, réessayez.',
      })
    })
  })

  describe('edge cases', () => {
    it('names the status of a failure with no sentence', async () => {
      expect(await fetchPlace('Q90', answering(500, {}))).toEqual({
        ok: false,
        message: 'Réponse inattendue (500).',
      })
    })
  })
})
