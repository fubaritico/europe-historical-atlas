import { describe, expect, it, vi } from 'vitest'

import { saveSovereign } from './saveSovereign'

/**
 * A `fetch` answering one status and body.
 * @param status - the status
 * @param body - the JSON body
 * @returns the stub
 */
function answering(status: number, body: unknown) {
  return vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })))
}

describe('saveSovereign', () => {
  describe('happy path', () => {
    it('patches the title with « souverain » ticked', async () => {
      const fetcher = answering(200, { doc: { id: 30 } })
      expect(await saveSovereign(fetcher, '/api', 30, true)).toEqual({ kind: 'saved' })
      const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
      expect([url, init.method]).toEqual(['/api/titles/30', 'PATCH'])
      expect(JSON.parse(init.body as string)).toEqual({ sovereign: true })
    })
  })

  describe('variants', () => {
    it('unticks it', async () => {
      const fetcher = answering(200, { doc: { id: 30 } })
      await saveSovereign(fetcher, '/api', 30, false)
      const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
      expect(JSON.parse(init.body as string)).toEqual({ sovereign: false })
    })
  })

  describe('managed errors', () => {
    it("gives the server's sentence for a refusal", async () => {
      const fetcher = answering(403, { errors: [{ message: 'Vous ne pouvez pas.' }] })
      expect(await saveSovereign(fetcher, '/api', 30, true)).toEqual({
        kind: 'refused',
        message: 'Vous ne pouvez pas.',
      })
    })
  })

  describe('unmanaged errors', () => {
    it('throws on a server that fails', async () => {
      await expect(saveSovereign(answering(500, {}), '/api', 30, true)).rejects.toThrow(
        "[CMS] the API failed to save a title's sovereignty (500)"
      )
    })
  })

  // L5: N/A — one request, no boundary of its own.
})
