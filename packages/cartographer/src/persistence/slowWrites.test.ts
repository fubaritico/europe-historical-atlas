import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SLOW_WRITE_MS, slowWrites, wantsSlowWrites, writesFetch } from './slowWrites'

import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/** A fetch that answers at once, and the waits asked of the switch. */
function harness() {
  const fetchFile = vi.fn<FetchLike>(() => Promise.resolve(new Response(null, { status: 200 })))
  const waits: number[] = []
  const wait = (ms: number): Promise<void> => {
    waits.push(ms)
    return Promise.resolve()
  }
  return { fetchFile, waits, wait }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('slowWrites', () => {
  describe('happy path', () => {
    it('holds a write back before sending it', async () => {
      const { fetchFile, waits, wait } = harness()
      await slowWrites(fetchFile, SLOW_WRITE_MS, wait)('/__years/1100', { method: 'PUT' })
      expect(waits).toEqual([15_000])
      expect(fetchFile).toHaveBeenCalledTimes(1)
    })
  })

  describe('variants', () => {
    it('lets a read through at once', async () => {
      const { fetchFile, waits, wait } = harness()
      await slowWrites(fetchFile, SLOW_WRITE_MS, wait)('/years/1100/registry.json')
      expect(waits).toEqual([])
      expect(fetchFile).toHaveBeenCalledTimes(1)
    })

    it('is asked for only with ?slow=save, and only in development', () => {
      expect(wantsSlowWrites('?slow=save', true)).toBe(true)
      expect(wantsSlowWrites('?slow=save', false)).toBe(false)
      expect(wantsSlowWrites('?break=canvas', true)).toBe(false)
    })

    it('gives the plain fetch back when the page does not ask', () => {
      const { fetchFile, wait } = harness()
      expect(writesFetch(fetchFile, false, wait)).toBe(fetchFile)
    })
  })

  describe('managed errors', () => {
    it('says in the console that a write is held back', async () => {
      const { fetchFile, wait } = harness()
      await slowWrites(fetchFile, SLOW_WRITE_MS, wait)('/__drafts/1100', { method: 'POST' })
      expect(console.warn).toHaveBeenCalledWith(
        '[Cartographer] ?slow=save: this write is held back 15 s'
      )
    })
  })

  // L4: N/A — a failed write passes through untouched, as the wrapped fetch returns it.
  // L5: N/A — the switch has no state between two calls.
})
