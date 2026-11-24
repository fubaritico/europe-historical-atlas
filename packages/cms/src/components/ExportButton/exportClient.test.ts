import { afterEach, describe, expect, it, vi } from 'vitest'

import { exportedSentence, runExport } from './exportClient'

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

/** What the route answers after the export of 24/11. */
const WRITTEN = { events: 11, atlasCities: 116, cities: 13698, territories: 402 }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('exportClient', () => {
  describe('happy path', () => {
    it('says what the export wrote', async () => {
      expect(await runExport(answering(200, WRITTEN))).toEqual({
        ok: true,
        message:
          // French writes thousands with a narrow no-break space
          'Base exportée : 11 événements, 13 698 villes dont 116 sur l’atlas, 402 territoires.',
      })
    })
  })

  describe('variants', () => {
    it('posts to the route, signed in', async () => {
      const fetchFile = answering(200, WRITTEN)
      await runExport(fetchFile)
      expect(fetchFile).toHaveBeenCalledWith('/api/export-content', {
        method: 'POST',
        credentials: 'include',
      })
    })

    it('writes one of each in the singular', () => {
      expect(exportedSentence({ events: 1, atlasCities: 1, cities: 1, territories: 1 })).toBe(
        'Base exportée : 1 événement, 1 ville dont 1 sur l’atlas, 1 territoire.'
      )
    })
  })

  describe('managed errors', () => {
    it('shows the route’s sentence when the export is refused, and logs it', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const refusal =
        'L’export est refusé, aucun fichier n’est écrit : the city sheet 1455 names no holder'
      expect(await runExport(answering(422, { error: refusal }))).toEqual({
        ok: false,
        message: refusal,
      })
      expect(error).toHaveBeenCalledWith(`[CMS] the export failed: ${refusal}`)
    })

    it('says the CMS does not answer when the route cannot be reached, and logs it', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const fetchFile = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      expect(await runExport(fetchFile)).toEqual({
        ok: false,
        message: 'L’outil de contribution ne répond pas : l’export n’a pas été lancé, réessayez.',
      })
      expect(error).toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('says an answer it cannot read, with its status', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      expect(await runExport(answering(502, '<html>'))).toEqual({
        ok: false,
        message: 'Réponse inattendue de l’export (502).',
      })
    })

    it('does not take a success without its counts for an export', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      expect((await runExport(answering(200, { events: 11 }))).ok).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('counts an empty base', () => {
      expect(exportedSentence({ events: 0, atlasCities: 0, cities: 0, territories: 0 })).toBe(
        'Base exportée : 0 événements, 0 villes dont 0 sur l’atlas, 0 territoires.'
      )
    })
  })
})
