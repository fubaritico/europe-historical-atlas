import { describe, expect, it, vi } from 'vitest'

import { MAX_RECORDS, searchRecords } from './searchRecords'

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
const places = { api: '/api', collection: 'places', field: 'name', locale: 'fr' }

/** Where the sources are searched: by their title. */
const sources = { api: '/api', collection: 'sources', field: 'title', locale: 'fr' }

describe('searchRecords', () => {
  describe('happy path', () => {
    it('answers the matching places, their id and their name', async () => {
      const fetcher = answering(200, { docs: [{ id: 5, name: 'Rome' }] })
      await expect(searchRecords(fetcher, places, 'Ro')).resolves.toEqual([{ id: 5, name: 'Rome' }])
    })
  })

  describe('variants', () => {
    it('asks the base for names containing what was typed, in the content language, a few at most', async () => {
      const fetcher = answering(200, { docs: [] })
      await searchRecords(fetcher, { ...places, locale: 'en' }, 'Cor')
      const url = new URL(fetcher.mock.calls[0]?.[0] as string, 'http://localhost')
      expect(url.pathname).toBe('/api/places')
      expect(url.searchParams.get('where[name][like]')).toBe('Cor')
      expect(url.searchParams.get('locale')).toBe('en')
      expect(url.searchParams.get('limit')).toBe(String(MAX_RECORDS))
      expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' })
    })

    it('searches the sources by their title, and names each by it', async () => {
      const fetcher = answering(200, { docs: [{ id: 4, title: 'Buringh 2021' }] })
      await expect(searchRecords(fetcher, sources, 'Bur')).resolves.toEqual([
        { id: 4, name: 'Buringh 2021' },
      ])
      const url = new URL(fetcher.mock.calls[0]?.[0] as string, 'http://localhost')
      expect(url.pathname).toBe('/api/sources')
      expect(url.searchParams.get('where[title][like]')).toBe('Bur')
    })

    it('answers no record when none matches', async () => {
      await expect(searchRecords(answering(200, { docs: [] }), places, 'Zz')).resolves.toEqual([])
    })
  })

  describe('managed errors', () => {
    it('throws when the base refuses the search', async () => {
      await expect(searchRecords(answering(403, {}), places, 'Ro')).rejects.toThrow(
        'search in places was refused (403)'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('throws on an answer with no list', async () => {
      await expect(searchRecords(answering(200, {}), places, 'Ro')).rejects.toThrow('no list')
    })

    it('throws on a record without its name', async () => {
      await expect(
        searchRecords(answering(200, { docs: [{ id: 5 }] }), places, 'Ro')
      ).rejects.toThrow('without its id or name')
    })
  })

  describe('edge cases', () => {
    it('sends what was typed as it is, a space or an accent included', async () => {
      const fetcher = answering(200, { docs: [] })
      await searchRecords(fetcher, places, 'Saint-Jean d’Acre')
      const url = new URL(fetcher.mock.calls[0]?.[0] as string, 'http://localhost')
      expect(url.searchParams.get('where[name][like]')).toBe('Saint-Jean d’Acre')
    })
  })
})
