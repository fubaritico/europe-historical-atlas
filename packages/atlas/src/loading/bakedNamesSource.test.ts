import { describe, expect, it, vi } from 'vitest'

import { BAKED_NAMES_VERSION } from '@europe-historical-atlas/core/pipeline/bakedNames'

import { createFetchBakedNamesSource } from './bakedNamesSource'

const BAKED = {
  version: BAKED_NAMES_VERSION,
  key: 'k',
  names: { levels: [], gridWidth: 1200, gridHeight: 1091, unnamed: [] },
}

/**
 * A transport answering one response.
 * @param body - the body
 * @param init - its status and headers
 * @returns the transport, as a spy
 */
function answering(body: string, init: ResponseInit) {
  return vi.fn(() => Promise.resolve(new Response(body, init)))
}

const JSON_TYPE = { 'content-type': 'application/json' }

// ATLAS-333: the names the build placed, read by the page — none is the dev server's normal case.
describe('createFetchBakedNamesSource', () => {
  describe('happy path', () => {
    it('reads 1100’s baked names from its folder', async () => {
      const fetchFile = answering(JSON.stringify(BAKED), { status: 200, headers: JSON_TYPE })
      const baked = await createFetchBakedNamesSource('/years/', fetchFile).load(1100)
      expect(fetchFile).toHaveBeenCalledWith('/years/1100/names.json')
      expect(baked?.key).toBe('k')
    })
  })

  describe('variants', () => {
    it('answers none when the site holds no file for the year', async () => {
      const source = createFetchBakedNamesSource('/years', answering('', { status: 404 }))
      expect(await source.load(1200)).toBeNull()
    })

    it('answers none when the dev server answers with its page', async () => {
      const page = answering('<!doctype html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
      expect(await createFetchBakedNamesSource('/years', page).load(1100)).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('refuses a server error, naming the file', async () => {
      const source = createFetchBakedNamesSource('/years', answering('', { status: 500 }))
      await expect(source.load(1100)).rejects.toThrow('/years/1100/names.json: HTTP 500')
    })

    it('refuses a file that is not baked names', async () => {
      const wrong = answering(JSON.stringify({ version: 9 }), { status: 200, headers: JSON_TYPE })
      await expect(createFetchBakedNamesSource('/years', wrong).load(1100)).rejects.toThrow(
        "is not a year's baked names"
      )
    })
  })

  describe('unmanaged errors', () => {
    it('lets a failed transport through', async () => {
      const down = vi.fn(() => Promise.reject(new Error('offline')))
      await expect(createFetchBakedNamesSource('/years', down).load(1100)).rejects.toThrow(
        'offline'
      )
    })
  })

  describe('edge cases', () => {
    it('answers none for a 200 with no content type', async () => {
      const bare = answering(JSON.stringify(BAKED), { status: 200 })
      // A Response built from a string sets text/plain: removed here to reach the missing header.
      bare.mockImplementation(() => {
        const response = new Response(JSON.stringify(BAKED), { status: 200 })
        response.headers.delete('content-type')
        return Promise.resolve(response)
      })
      expect(await createFetchBakedNamesSource('/years', bare).load(1100)).toBeNull()
    })
  })
})
