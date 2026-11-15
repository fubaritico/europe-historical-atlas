// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useRecordSearches } from './useRecordSearches'

/**
 * Stub the page's `fetch` with an empty answer.
 * @returns the stand-in, to read the address it was called with
 */
function stubFetch() {
  const fetcher = vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response(JSON.stringify({ docs: [] }), { status: 200 }))
  )
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

/**
 * The address a call was made to, read.
 * @param fetcher - the stand-in
 * @returns the address
 */
function calledUrl(fetcher: ReturnType<typeof stubFetch>): URL {
  return new URL(fetcher.mock.calls[0]?.[0] as string, 'http://localhost')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useRecordSearches', () => {
  describe('happy path', () => {
    it('searches the places by their name, in the content language', async () => {
      const fetcher = stubFetch()
      const { result } = renderHook(() => useRecordSearches('/api', 'en'))
      await result.current.places('Ro')
      const url = calledUrl(fetcher)
      expect(url.pathname).toBe('/api/places')
      expect(url.searchParams.get('where[name][like]')).toBe('Ro')
      expect(url.searchParams.get('locale')).toBe('en')
    })
  })

  describe('variants', () => {
    it('searches the sources by their title', async () => {
      const fetcher = stubFetch()
      const { result } = renderHook(() => useRecordSearches('/api', 'fr'))
      await result.current.sources('Bur')
      const url = calledUrl(fetcher)
      expect(url.pathname).toBe('/api/sources')
      expect(url.searchParams.get('where[title][like]')).toBe('Bur')
    })
  })

  describe('managed errors', () => {
    it('lets a failed search through, for the field to say', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
      )
      const { result } = renderHook(() => useRecordSearches('/api', 'fr'))
      await expect(result.current.sources('Bur')).rejects.toThrow('Failed to fetch')
    })
  })

  // L4: N/A — the searches only wire `searchRecords`, whose own suite holds its unmanaged errors.

  describe('edge cases', () => {
    it('keeps its searches across renders, and makes new ones for another language', () => {
      const { result, rerender } = renderHook(({ locale }) => useRecordSearches('/api', locale), {
        initialProps: { locale: 'fr' },
      })
      const first = result.current
      rerender({ locale: 'fr' })
      expect(result.current.places).toBe(first.places)
      rerender({ locale: 'en' })
      expect(result.current.sources).not.toBe(first.sources)
    })
  })
})
