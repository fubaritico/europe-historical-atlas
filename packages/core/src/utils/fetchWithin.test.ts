import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ANSWER_TIMEOUT_MS, createFetchWithin } from './fetchWithin'

import type { FetchLike } from './fetchWithin'

/** A fetch whose answer the test releases by hand, and which rejects with the signal's reason on abort. */
function heldFetch(): {
  fetchFile: FetchLike
  answer: (response: Response) => void
  seen: () => RequestInit | undefined
} {
  let release: ((response: Response) => void) | undefined
  let seenInit: RequestInit | undefined
  const fetchFile: FetchLike = (_input, init) => {
    seenInit = init
    return new Promise<Response>((resolve, reject) => {
      release = resolve
      init?.signal?.addEventListener('abort', () => {
        reject(init.signal?.reason as Error)
      })
    })
  }
  return {
    fetchFile,
    answer: (response) => release?.(response),
    seen: () => seenInit,
  }
}

const failing: FetchLike = () => Promise.reject(new TypeError('Failed to fetch'))

describe('createFetchWithin', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('happy path', () => {
    it('returns the response the server gives in time', async () => {
      const held = heldFetch()
      const request = createFetchWithin(held.fetchFile, 1000)('/years/1100/registry.json')
      held.answer(new Response('{}', { status: 200 }))
      await expect(request).resolves.toHaveProperty('status', 200)
    })
  })

  describe('variants', () => {
    it('passes the caller’s other options through', async () => {
      const held = heldFetch()
      const request = createFetchWithin(held.fetchFile, 1000)('/a', { method: 'PUT', body: 'x' })
      held.answer(new Response(null, { status: 204 }))
      await request
      expect(held.seen()?.method).toBe('PUT')
      expect(held.seen()?.body).toBe('x')
    })

    it('stops at the caller’s own abort, before the delay', async () => {
      const held = heldFetch()
      const caller = new AbortController()
      const request = createFetchWithin(held.fetchFile, 1000)('/a', { signal: caller.signal })
      caller.abort(new Error('the caller gave up'))
      await expect(request).rejects.toThrow('the caller gave up')
    })

    it('waits ten seconds by default in the applications', () => {
      expect(ANSWER_TIMEOUT_MS).toBe(10_000)
    })

    it('lets a write wait as long as the server takes', async () => {
      const held = heldFetch()
      const request = createFetchWithin(held.fetchFile, 1000)('/__years/1100', {
        method: 'PUT',
        body: '{}',
      })
      vi.advanceTimersByTime(60_000)
      held.answer(new Response(null, { status: 200 }))
      await expect(request).resolves.toHaveProperty('status', 200)
      expect(held.seen()?.signal).toBeUndefined()
    })

    it('reads the method of a Request when the options name none', async () => {
      const held = heldFetch()
      const request = createFetchWithin(
        held.fetchFile,
        1000
      )(new Request('https://example.org/x', { method: 'POST', body: 'x' }))
      vi.advanceTimersByTime(5000)
      held.answer(new Response(null, { status: 201 }))
      await expect(request).resolves.toHaveProperty('status', 201)
    })

    it('stops at the abort of a Request’s own signal', async () => {
      const held = heldFetch()
      const caller = new AbortController()
      const request = createFetchWithin(
        held.fetchFile,
        1000
      )(new Request('https://example.org/x', { signal: caller.signal }))
      caller.abort(new Error('the request was cancelled'))
      await expect(request).rejects.toThrow('the request was cancelled')
    })
  })

  describe('managed errors', () => {
    it('rejects naming the address and the delay when the server does not answer in time', async () => {
      const held = heldFetch()
      const request = createFetchWithin(
        held.fetchFile,
        10_000
      )('/heightmaps/europe-dem-z6-1920.bin')
      vi.advanceTimersByTime(10_000)
      await expect(request).rejects.toThrow(
        'no answer from /heightmaps/europe-dem-z6-1920.bin within 10 s'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('lets a network failure through unchanged', async () => {
      await expect(createFetchWithin(failing, 1000)('/a')).rejects.toThrow('Failed to fetch')
    })
  })

  describe('edge cases', () => {
    // The guard of the dev's rule: the delay covers the wait for the answer, never the download. A plain
    // `AbortSignal.timeout(ms)` on the request would still fire while the 6.4 MB body is arriving.
    it('leaves the download alone once the answer has arrived', async () => {
      const held = heldFetch()
      const request = createFetchWithin(held.fetchFile, 1000)('/heightmaps/europe-dem-z6-1920.bin')
      held.answer(new Response('body', { status: 200 }))
      await request
      vi.advanceTimersByTime(5000)
      expect(held.seen()?.signal?.aborted).toBe(false)
    })

    it('names the address of a URL and of a Request', async () => {
      const held = heldFetch()
      const byUrl = createFetchWithin(
        held.fetchFile,
        1000
      )(new URL('https://www.wikidata.org/w/api.php'))
      vi.advanceTimersByTime(1000)
      await expect(byUrl).rejects.toThrow(
        'no answer from https://www.wikidata.org/w/api.php within 1 s'
      )
      const byRequest = createFetchWithin(
        held.fetchFile,
        1000
      )(new Request('https://example.org/x'))
      vi.advanceTimersByTime(1000)
      await expect(byRequest).rejects.toThrow('no answer from https://example.org/x within 1 s')
    })
  })
})
