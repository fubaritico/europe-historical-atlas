import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAutosaveKeeper } from './autosaveKeeper'
import { persistenceWords } from './persistenceWords'

import type { AutosaveKeeperDeps } from './autosaveKeeper'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/** A store whose version a test bumps by hand, as a gesture would. */
function fakeStore() {
  let version = 0
  const document = { year: 1100 } as unknown as YearDocument
  const listeners = new Set<() => void>()
  return {
    getState: () => ({ document, version }),
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    gesture: () => {
      version += 1
      for (const listener of listeners) listener()
    },
  }
}

/** The keeper's world: a store, a recording write, a map that can change, the real timers faked by vitest. */
function world(write: AutosaveKeeperDeps['write'] = () => Promise.resolve()) {
  const store = fakeStore()
  const written: string[] = []
  let map = '1100'
  const report = vi.fn()
  const keeper = createAutosaveKeeper({
    store,
    write: (document, name) => {
      written.push(name)
      return write(document, name)
    },
    map: () => map,
    delayMs: 2000,
    // The faked clock moves with the timers: a name taken at each write would carry a later time.
    now: () => new Date(),
    timers: {
      set: (run, delayMs) => window.setTimeout(run, delayMs),
      clear: (handle) => {
        window.clearTimeout(handle)
      },
    },
    report,
    words: () => persistenceWords('en'),
  })
  return {
    store,
    written,
    keeper,
    report,
    rename: (next: string) => {
      map = next
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-02T19:05:12.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('createAutosaveKeeper', () => {
  describe('happy path', () => {
    it('writes the page as <map>.autosave.<time of opening>, two seconds after a gesture', async () => {
      const { store, written, keeper } = world()
      keeper.start()
      store.gesture()
      await vi.advanceTimersByTimeAsync(1999)
      expect(written).toEqual([])
      await vi.advanceTimersByTimeAsync(1)
      expect(written).toEqual(['1100.autosave.2026-11-02T19-05-12'])
    })
  })

  describe('variants', () => {
    it('rewrites the same folder after each pause — one per opening, never one per gesture', async () => {
      const { store, written, keeper } = world()
      keeper.start()
      store.gesture()
      await vi.advanceTimersByTimeAsync(2000)
      store.gesture()
      await vi.advanceTimersByTimeAsync(2000)
      expect(written).toEqual([
        '1100.autosave.2026-11-02T19-05-12',
        '1100.autosave.2026-11-02T19-05-12',
      ])
    })

    it('writes once for gestures closer than the delay', async () => {
      const { store, written, keeper } = world()
      keeper.start()
      store.gesture()
      await vi.advanceTimersByTimeAsync(1000)
      store.gesture()
      await vi.advanceTimersByTimeAsync(2000)
      expect(written).toHaveLength(1)
    })

    it('follows the map the page became after a Save as…', async () => {
      const { store, written, keeper, rename } = world()
      keeper.start()
      rename('1100-essai')
      store.gesture()
      await vi.advanceTimersByTimeAsync(2000)
      expect(written).toEqual(['1100-essai.autosave.2026-11-02T19-05-12'])
    })
  })

  describe('managed errors', () => {
    it('says a failed write once, then says when writes resume', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      let fail = true
      const { store, keeper, report } = world(() =>
        fail ? Promise.reject(new Error('disk full')) : Promise.resolve()
      )
      keeper.start()
      store.gesture()
      await vi.advanceTimersByTimeAsync(2000)
      store.gesture()
      await vi.advanceTimersByTimeAsync(2000)
      expect(report.mock.calls.map(([notice]) => (notice as { tone: string }).tone)).toEqual([
        'alarm',
      ])
      fail = false
      store.gesture()
      await vi.advanceTimersByTimeAsync(2000)
      expect(report.mock.calls.map(([notice]) => (notice as { tone: string }).tone)).toEqual([
        'alarm',
        'success',
      ])
    })
  })

  // L4: N/A — the write's own failures are the managed ones above; the keeper calls nothing else that throws.

  describe('edge cases', () => {
    it('writes nothing before it is started, nor once stopped', async () => {
      const { store, written, keeper } = world()
      store.gesture()
      await vi.advanceTimersByTimeAsync(2000)
      keeper.start()
      keeper.stop()
      store.gesture()
      await vi.advanceTimersByTimeAsync(2000)
      expect(written).toEqual([])
    })

    it('cancels a write still waiting when it is stopped', async () => {
      const { store, written, keeper } = world()
      keeper.start()
      store.gesture()
      keeper.stop()
      await vi.advanceTimersByTimeAsync(2000)
      expect(written).toEqual([])
    })
  })
})
