import { describe, expect, it, vi } from 'vitest'

import { fetchPlaceSheets } from './fetchPlaceSheets'

/**
 * A `fetch` answering one response.
 * @param status - the HTTP status
 * @param json - the body
 * @returns the stand-in
 */
function answering(status: number, json: unknown) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(json), { status })))
}

/** Rome's saved sheet, its date reduced to the year. */
const rome = { id: 1, date: { start: { year: 1100 } } }

describe('fetchPlaceSheets', () => {
  describe('happy path', () => {
    it('answers the place’s saved sheets, their id and their date', async () => {
      await expect(fetchPlaceSheets(answering(200, { docs: [rome] }), '/api', 5)).resolves.toEqual([
        rome,
      ])
    })
  })

  describe('variants', () => {
    it('asks the base for every sheet of that place, unpaginated, with the admin’s cookie', async () => {
      const fetcher = answering(200, { docs: [] })
      await fetchPlaceSheets(fetcher, '/api', 5)
      const url = new URL(fetcher.mock.calls[0]?.[0] as string, 'http://localhost')
      expect(url.pathname).toBe('/api/place-periods')
      expect(url.searchParams.get('where[place][equals]')).toBe('5')
      expect(url.searchParams.get('pagination')).toBe('false')
      expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' })
    })
  })

  describe('managed errors', () => {
    it('throws when the base refuses', async () => {
      await expect(fetchPlaceSheets(answering(403, {}), '/api', 5)).rejects.toThrow(
        'could not be read (403)'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('throws on an answer with no list', async () => {
      await expect(fetchPlaceSheets(answering(200, {}), '/api', 5)).rejects.toThrow(
        'answered no list'
      )
    })

    it('throws on a sheet without its date', async () => {
      await expect(
        fetchPlaceSheets(answering(200, { docs: [{ id: 1 }] }), '/api', 5)
      ).rejects.toThrow('without its id or its date')
    })

    // Played against it, the overlap would throw inside the form's validation, where nothing catches it.
    it('throws on a saved sheet whose date does not read — the year 0', async () => {
      const zero = { id: 3, date: { start: { year: 0 } } }
      await expect(
        fetchPlaceSheets(answering(200, { docs: [rome, zero] }), '/api', 5)
      ).rejects.toThrow('sheet 3 holds a date that does not read')
    })
  })

  describe('edge cases', () => {
    it('answers no sheet for a place that has none', async () => {
      await expect(fetchPlaceSheets(answering(200, { docs: [] }), '/api', 5)).resolves.toEqual([])
    })
  })
})
