import { describe, expect, it, vi } from 'vitest'

import { MAX_PLACES, searchPlaces } from './searchPlaces'

/**
 * A `fetch` answering one response.
 * @param status - the HTTP status
 * @param json - the body
 * @returns the stand-in
 */
function answering(status: number, json: unknown) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(json), { status })))
}

/** Where the places are searched. */
const target = { api: '/api', locale: 'fr' }

describe('searchPlaces', () => {
  describe('happy path', () => {
    it('answers the matching places, their id and their name', async () => {
      const fetcher = answering(200, { docs: [{ id: 5, name: 'Rome' }] })
      await expect(searchPlaces(fetcher, target, 'Ro')).resolves.toEqual([{ id: 5, name: 'Rome' }])
    })
  })

  describe('variants', () => {
    it('asks the base for names containing what was typed, in the content language, a few at most', async () => {
      const fetcher = answering(200, { docs: [] })
      await searchPlaces(fetcher, { api: '/api', locale: 'en' }, 'Cor')
      const url = new URL(fetcher.mock.calls[0]?.[0] as string, 'http://localhost')
      expect(url.pathname).toBe('/api/places')
      expect(url.searchParams.get('where[name][like]')).toBe('Cor')
      expect(url.searchParams.get('locale')).toBe('en')
      expect(url.searchParams.get('limit')).toBe(String(MAX_PLACES))
      expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' })
    })

    it('answers no place when none matches', async () => {
      await expect(searchPlaces(answering(200, { docs: [] }), target, 'Zz')).resolves.toEqual([])
    })
  })

  describe('managed errors', () => {
    it('throws when the base refuses the search', async () => {
      await expect(searchPlaces(answering(403, {}), target, 'Ro')).rejects.toThrow('refused (403)')
    })
  })

  describe('unmanaged errors', () => {
    it('throws on an answer with no list', async () => {
      await expect(searchPlaces(answering(200, {}), target, 'Ro')).rejects.toThrow('no list')
    })

    it('throws on a place without its name', async () => {
      await expect(
        searchPlaces(answering(200, { docs: [{ id: 5 }] }), target, 'Ro')
      ).rejects.toThrow('without its id or name')
    })
  })

  describe('edge cases', () => {
    it('sends what was typed as it is, a space or an accent included', async () => {
      const fetcher = answering(200, { docs: [] })
      await searchPlaces(fetcher, target, 'Saint-Jean d’Acre')
      const url = new URL(fetcher.mock.calls[0]?.[0] as string, 'http://localhost')
      expect(url.searchParams.get('where[name][like]')).toBe('Saint-Jean d’Acre')
    })
  })
})
