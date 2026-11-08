import { describe, expect, it, vi } from 'vitest'

import { saveSheet } from './saveSheet'

import type { SheetBody } from './sheetValues'

/** Rome in 1100, as the form sends it. */
const body: SheetBody = {
  place: 5,
  date: {
    start: { year: 1100, month: null, day: null, circa: false, margin: null, calendar: 'julian' },
    end: { year: null, month: null, day: null, circa: false, margin: null, calendar: 'julian' },
  },
  importance: 'capital',
  reasons: [],
  testimonies: [],
  holderName: null,
  holderQid: null,
  showInAtlas: false,
}

/**
 * A `fetch` answering one response.
 * @param status - the HTTP status
 * @param json - the body
 * @returns the stand-in, to read its calls
 */
function answering(status: number, json: unknown) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(json), { status })))
}

describe('saveSheet', () => {
  describe('happy path', () => {
    it('creates a new sheet by POST, with the admin’s cookie, and answers its id', async () => {
      const fetcher = answering(201, { doc: { id: 2 } })
      await expect(saveSheet(fetcher, { api: '/api' }, body)).resolves.toEqual({
        kind: 'saved',
        id: 2,
      })
      const [url, init] = fetcher.mock.calls[0] ?? []
      expect(url).toBe('/api/place-periods')
      expect(init).toMatchObject({ method: 'POST', credentials: 'include' })
      expect(JSON.parse(init?.body as string)).toEqual(body)
    })
  })

  describe('variants', () => {
    it('updates an existing sheet by PATCH at its address', async () => {
      const fetcher = answering(200, { doc: { id: 1 } })
      await expect(saveSheet(fetcher, { api: '/api', id: 1 }, body)).resolves.toEqual({
        kind: 'saved',
        id: 1,
      })
      expect(fetcher.mock.calls[0]?.[0]).toBe('/api/place-periods/1')
      expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: 'PATCH' })
    })
  })

  describe('managed errors', () => {
    it('answers the server’s refusal with its sentence and the field it names', async () => {
      const message = 'Rome a déjà une fiche pour 1100.'
      const fetcher = answering(400, {
        errors: [{ message, data: { errors: [{ path: 'date.start.year', message }] } }],
      })
      await expect(saveSheet(fetcher, { api: '/api' }, body)).resolves.toEqual({
        kind: 'refused',
        message,
        fields: [{ path: 'date.start.year', message }],
      })
    })

    it('answers a refusal that names no field with no field', async () => {
      const fetcher = answering(403, { errors: [{ message: 'You are not allowed.' }] })
      await expect(saveSheet(fetcher, { api: '/api' }, body)).resolves.toEqual({
        kind: 'refused',
        message: 'You are not allowed.',
        fields: [],
      })
    })
  })

  describe('unmanaged errors', () => {
    it('lets an unreachable server’s error through, for the form to say', async () => {
      const fetcher = vi.fn<typeof fetch>(() => Promise.reject(new TypeError('Failed to fetch')))
      await expect(saveSheet(fetcher, { api: '/api' }, body)).rejects.toThrow('Failed to fetch')
    })

    it('throws on a refusal that is not Payload’s', async () => {
      await expect(saveSheet(answering(500, {}), { api: '/api' }, body)).rejects.toThrow(
        'without a message (500)'
      )
    })
    it('throws an answer that is not JSON — a crashed server’s page — as a fault, its status named', async () => {
      const fetcher = vi.fn<typeof fetch>(() =>
        Promise.resolve(new Response('<html>500</html>', { status: 500 }))
      )
      await expect(saveSheet(fetcher, { api: '/api' }, body)).rejects.toThrow(
        'answered 500 without JSON'
      )
    })
  })

  describe('edge cases', () => {
    it('throws on a save answered without an id', async () => {
      await expect(saveSheet(answering(201, { doc: {} }), { api: '/api' }, body)).rejects.toThrow(
        'without giving its id'
      )
    })
  })
})
