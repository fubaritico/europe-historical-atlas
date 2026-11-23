import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchLabels } from './fetchLabels'

import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/** A fast pace for the tests: the pauses are only recorded. */
const PACE = { between: 250, retry: 5000, attempts: 3 }

/**
 * Wikidata as a stand-in: each item named in a request answers its own id as its French label.
 * @param refusals - how many requests are refused first, with a 429
 * @returns the stand-in
 */
function wikidata(refusals = 0) {
  let refused = 0
  return vi.fn<FetchLike>((url) => {
    if (refused < refusals) {
      refused += 1
      return Promise.resolve(new Response('', { status: 429 }))
    }
    const ids = new URL(url as string).searchParams.get('ids')?.split('|') ?? []
    const entities = Object.fromEntries(ids.map((id) => [id, { labels: { fr: { value: id } } }]))
    return Promise.resolve(Response.json({ entities }))
  })
}

/**
 * `n` items.
 * @param n - how many
 * @returns `Q1` to `Qn`
 */
function items(n: number): string[] {
  return Array.from({ length: n }, (_, index) => `Q${String(index + 1)}`)
}

describe('fetchLabels', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('asks fifty items a request, one lot after the other with a pause, and gathers every name', async () => {
      const fetchFile = wikidata()
      const wait = vi.fn(() => Promise.resolve())
      const names = await fetchLabels(items(120), fetchFile, wait, PACE)
      expect(fetchFile).toHaveBeenCalledTimes(3)
      expect(wait.mock.calls).toEqual([[250], [250]])
      expect(names.size).toBe(120)
      expect(names.get('Q120')).toEqual({ fr: 'Q120', en: null, mul: null, aliasesFr: [] })
    })
  })

  describe('variants', () => {
    it('asks a refused lot again, waiting longer each time, and goes on', async () => {
      const fetchFile = wikidata(2)
      const wait = vi.fn(() => Promise.resolve())
      const names = await fetchLabels(items(3), fetchFile, wait, PACE)
      expect(fetchFile).toHaveBeenCalledTimes(3)
      expect(wait.mock.calls).toEqual([[5000], [10000]])
      expect(names.size).toBe(3)
      expect(console.warn).toHaveBeenCalledTimes(2)
    })
  })

  describe('managed errors', () => {
    it('stops at a lot still refused at its last attempt, naming it and the refusal', async () => {
      const fetchFile = wikidata(10)
      await expect(
        fetchLabels(items(60), fetchFile, () => Promise.resolve(), PACE)
      ).rejects.toThrow(
        'Wikidata n’a pas répondu pour le lot qui commence à Q1 après 3 essais (HTTP 429) : rien n’est écrit.'
      )
      expect(fetchFile).toHaveBeenCalledTimes(3)
    })
  })

  describe('unmanaged errors', () => {
    it('asks again when the network itself fails, and stops with its message', async () => {
      const fetchFile = vi.fn<FetchLike>(() => Promise.reject(new Error('ENOTFOUND')))
      await expect(fetchLabels(items(1), fetchFile, () => Promise.resolve(), PACE)).rejects.toThrow(
        '(ENOTFOUND)'
      )
      expect(fetchFile).toHaveBeenCalledTimes(3)
    })
  })

  describe('edge cases', () => {
    it('asks nothing for no items', async () => {
      const fetchFile = wikidata()
      expect((await fetchLabels([], fetchFile, () => Promise.resolve(), PACE)).size).toBe(0)
      expect(fetchFile).not.toHaveBeenCalled()
    })
  })
})
