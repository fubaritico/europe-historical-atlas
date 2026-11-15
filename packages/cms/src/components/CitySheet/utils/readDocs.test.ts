import { describe, expect, it } from 'vitest'

import { readDocs } from './readDocs'

/**
 * An answer of the API.
 * @param body - its JSON
 * @param status - its HTTP status
 * @returns the response
 */
function answer(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

describe('readDocs', () => {
  describe('happy path', () => {
    it('gives the documents of a list', async () => {
      expect(
        await readDocs(answer({ docs: [{ id: 1 }] }), 'the titles', 'could not be read')
      ).toEqual([{ id: 1 }])
    })
  })

  describe('variants', () => {
    it('gives an empty list as empty', async () => {
      expect(await readDocs(answer({ docs: [] }), 'the titles', 'could not be read')).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('says a refusal in its caller’s words, with the status', async () => {
      await expect(
        readDocs(answer({}, 403), 'the search in places', 'was refused')
      ).rejects.toThrow('[CMS] the search in places was refused (403)')
    })
  })

  describe('unmanaged errors', () => {
    it('refuses an answer that is not a list', async () => {
      await expect(
        readDocs(answer({ doc: {} }), 'the titles', 'could not be read')
      ).rejects.toThrow('[CMS] the titles answered no list')
    })
  })

  describe('edge cases', () => {
    it('refuses an answer that is not JSON', async () => {
      await expect(
        readDocs(new Response('<html>', { status: 200 }), 'the titles', 'could not be read')
      ).rejects.toThrow()
    })
  })
})
