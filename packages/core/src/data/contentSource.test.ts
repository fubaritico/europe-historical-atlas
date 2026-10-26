import { afterEach, describe, expect, it, vi } from 'vitest'

import { isAssetError } from './assetError'
import { createFetchContentSource, parseContentFile } from './contentSource'

const EMPTY = { version: 2, events: [] }

/**
 * Answer every fetch with one response.
 * @param response - what fetch resolves to
 */
function answer(response: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('contentSource', () => {
  describe('happy path', () => {
    it('loads and checks the exported file', async () => {
      answer({ ok: true, json: () => Promise.resolve(EMPTY) })
      await expect(createFetchContentSource('/content/events.json').load()).resolves.toEqual(EMPTY)
    })
  })

  describe('variants', () => {
    it('reads a file from a parsed value', () => {
      expect(parseContentFile(EMPTY, 'here')).toEqual(EMPTY)
    })
  })

  describe('managed errors', () => {
    it('refuses a missing file as a transport failure of the content', async () => {
      answer({ ok: false, status: 404 })
      const error: unknown = await createFetchContentSource('/content/events.json')
        .load()
        .catch((caught: unknown) => caught)
      expect(isAssetError(error) && [error.asset, error.failure]).toEqual(['content', 'transport'])
    })

    it('refuses a file of the wrong shape, naming the field', () => {
      expect(() => parseContentFile({ version: 2, events: 'none' }, 'here')).toThrow(/events/)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a value that is not an object', () => {
      expect(() => parseContentFile(null, 'here')).toThrow()
    })
  })

  describe('edge cases', () => {
    it('refuses a newer version of the format', () => {
      expect(() => parseContentFile({ version: 3, events: [] }, 'here')).toThrow()
    })
  })
})
