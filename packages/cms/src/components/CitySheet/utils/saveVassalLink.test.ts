import { describe, expect, it, vi } from 'vitest'

import { saveVassalLink, updateVassalLink, withFirstSource } from './saveVassalLink'

const LINK = { vassal: 10, suzerain: 20, source: 4, year: 1100 }

/**
 * A `fetch` answering one status and body.
 * @param status - the status
 * @param body - the JSON body, or a text that is not JSON
 * @returns the stub
 */
function answering(status: number, body: unknown) {
  return vi.fn(() =>
    Promise.resolve(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
    )
  )
}

describe('saveVassalLink', () => {
  describe('happy path', () => {
    it('posts the link to « Maillons », its source as its one line, its year as its start', async () => {
      const fetcher = answering(201, { doc: { id: 7 } })
      expect(await saveVassalLink(fetcher, '/api', LINK)).toEqual({ kind: 'saved' })
      const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
      expect(url).toBe('/api/vassal-links')
      expect(init.method).toBe('POST')
      expect(init.credentials).toBe('include')
      expect(JSON.parse(init.body as string)).toEqual({
        vassal: 10,
        answersTo: 'suzerain',
        suzerain: 20,
        date: { start: { year: 1100 } },
        lines: [{ source: 4 }],
      })
    })
  })

  describe('variants', () => {
    it('gives the field’s own sentence when the refusal names a field', async () => {
      const fetcher = answering(400, {
        errors: [
          {
            message: 'The following field is invalid: suzerain',
            data: { errors: [{ message: 'Un titre ne relève pas de lui-même.' }] },
          },
        ],
      })
      expect(await saveVassalLink(fetcher, '/api', LINK)).toEqual({
        kind: 'refused',
        message: 'Un titre ne relève pas de lui-même.',
      })
    })
  })

  describe('managed errors', () => {
    it('gives the server’s sentence for a link entered twice', async () => {
      const fetcher = answering(400, { errors: [{ message: 'Ce maillon existe déjà.' }] })
      expect(await saveVassalLink(fetcher, '/api', LINK)).toEqual({
        kind: 'refused',
        message: 'Ce maillon existe déjà.',
      })
    })
  })

  describe('unmanaged errors', () => {
    it('throws on a server that fails, from 500 on — 499 is a refusal', async () => {
      await expect(
        saveVassalLink(answering(499, { errors: [{ message: 'Refusé.' }] }), '/api', LINK)
      ).resolves.toEqual({ kind: 'refused', message: 'Refusé.' })

      await expect(saveVassalLink(answering(500, {}), '/api', LINK)).rejects.toThrow(
        '[CMS] the API failed to save a link of vassalage (500)'
      )
    })

    it('throws on a refusal whose errors carry no sentence', async () => {
      await expect(saveVassalLink(answering(400, { errors: [] }), '/api', LINK)).rejects.toThrow(
        'without a message (400)'
      )
    })

    it('throws on a refusal without a sentence, JSON or not', async () => {
      await expect(saveVassalLink(answering(403, 'Forbidden'), '/api', LINK)).rejects.toThrow(
        '[CMS] the API refused a link of vassalage without a message (403)'
      )
    })

    it('lets an unreachable server through', async () => {
      const fetcher = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
      await expect(saveVassalLink(fetcher, '/api', LINK)).rejects.toThrow(TypeError)
    })
  })

  // L5: N/A — one request, no boundary of its own; the ids are the server's to check.
})

/** A link the historian sourced twice, the first line with its passage and quotation. */
const STORED = {
  lines: [
    { id: 'a', source: 4, where: 'p. 12', quotation: 'comes Hainoensis' },
    { id: 'b', source: 9, where: '§ 3', quotation: 'fidelis regis' },
  ],
}

/**
 * A `fetch` that reads the link, then saves it — every call kept.
 * @returns the stub
 */
function readingThenSaving() {
  return vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(
      init?.method === 'PATCH'
        ? new Response(JSON.stringify({ doc: { id: 7 } }), { status: 200 })
        : new Response(JSON.stringify(STORED), { status: 200 })
    )
  )
}

/**
 * The body of the PATCH a stub received.
 * @param fetcher - the stub
 * @returns the body, parsed
 */
function patched(fetcher: ReturnType<typeof readingThenSaving>): unknown {
  const call = fetcher.mock.calls.find(([, init]) => init?.method === 'PATCH')
  return JSON.parse(call?.[1]?.body as string)
}

// Review ARCH-001, 2026-11-16: a changed suzerain once rewrote the lines from the sheet's copy, wiping the others
describe('updateVassalLink', () => {
  describe('happy path', () => {
    it('changes the suzerain alone, never touching the lines, when the source did not change', async () => {
      const fetcher = readingThenSaving()
      const change = { link: '7', suzerain: 30, source: 4, sourceChanged: false }
      expect(await updateVassalLink(fetcher, '/api', change)).toEqual({ kind: 'saved' })
      expect(patched(fetcher)).toEqual({ suzerain: 30 })
      expect(fetcher).toHaveBeenCalledOnce()
    })
  })

  describe('variants', () => {
    it('replaces the first line only when the source changed, the others kept whole', async () => {
      const fetcher = readingThenSaving()
      await updateVassalLink(fetcher, '/api', {
        link: '7',
        suzerain: 30,
        source: 5,
        sourceChanged: true,
      })
      expect(patched(fetcher)).toEqual({
        suzerain: 30,
        lines: [{ source: 5 }, STORED.lines[1]],
      })
    })

    it('removes the first line only when the source is emptied', async () => {
      const fetcher = readingThenSaving()
      await updateVassalLink(fetcher, '/api', {
        link: '7',
        suzerain: 30,
        source: null,
        sourceChanged: true,
      })
      expect(patched(fetcher)).toEqual({ suzerain: 30, lines: [STORED.lines[1]] })
    })
  })

  describe('unmanaged errors', () => {
    it('saves nothing when the link cannot be read', async () => {
      const fetcher = vi.fn(() => Promise.resolve(new Response('', { status: 404 })))
      await expect(
        updateVassalLink(fetcher, '/api', {
          link: '7',
          suzerain: 30,
          source: 5,
          sourceChanged: true,
        })
      ).rejects.toThrow('read a link of vassalage')
      expect(fetcher).toHaveBeenCalledOnce()
    })
  })

  describe('edge cases', () => {
    it('sets the source as the one line of a link that had none', () => {
      expect(withFirstSource([], 5)).toEqual([{ source: 5 }])
    })
  })
})
