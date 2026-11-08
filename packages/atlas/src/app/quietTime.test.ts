import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { QUIET_AFTER_MS, createQuietTime } from './quietTime'

import type { QuietWindow } from './quietTime'

/**
 * A window over fake timers, its listeners reachable.
 * @param idle - whether it offers `requestIdleCallback`
 * @returns the window and a way to fire its events
 */
function fakeWindow(idle = true) {
  const listeners = new Map<string, Set<() => void>>()
  const win: QuietWindow = {
    addEventListener: (type, listener) => {
      const set = listeners.get(type) ?? new Set()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener: (type, listener) => {
      listeners.get(type)?.delete(listener)
    },
    setTimeout: (handler, ms) => setTimeout(handler, ms),
    clearTimeout: (id) => {
      clearTimeout(id)
    },
  }
  if (idle) win.requestIdleCallback = (callback) => setTimeout(callback, 5)
  const fire = (type: string): void => {
    for (const listener of [...(listeners.get(type) ?? [])]) listener()
  }
  return { win, fire }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ATLAS-333: a map is prepared only when the reader leaves the map alone.
describe('createQuietTime', () => {
  describe('happy path', () => {
    it('is quiet once the page is idle, when the reader has not acted', async () => {
      const { win } = fakeWindow()
      const quiet = createQuietTime(win, () => Date.now())
      const done = vi.fn()
      void quiet.whenQuiet().then(done)
      await vi.advanceTimersByTimeAsync(10)
      expect(done).toHaveBeenCalled()
    })
  })

  describe('variants', () => {
    it('waits until the reader has left the map alone a moment', async () => {
      const { win, fire } = fakeWindow()
      const quiet = createQuietTime(win, () => Date.now())
      fire('pointermove')
      const done = vi.fn()
      void quiet.whenQuiet().then(done)
      await vi.advanceTimersByTimeAsync(QUIET_AFTER_MS - 100)
      fire('wheel')
      await vi.advanceTimersByTimeAsync(QUIET_AFTER_MS - 100)
      expect(done).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(200)
      expect(done).toHaveBeenCalled()
    })

    it('ends a sleep at once when the network comes back', async () => {
      const { win, fire } = fakeWindow()
      const quiet = createQuietTime(win, () => Date.now())
      const done = vi.fn()
      void quiet.sleep(30_000).then(done)
      fire('online')
      await vi.advanceTimersByTimeAsync(0)
      expect(done).toHaveBeenCalled()
    })

    it('ends a sleep after its time', async () => {
      const { win } = fakeWindow()
      const quiet = createQuietTime(win, () => Date.now())
      const done = vi.fn()
      void quiet.sleep(1000).then(done)
      await vi.advanceTimersByTimeAsync(999)
      expect(done).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1)
      expect(done).toHaveBeenCalled()
    })
  })

  // L3, L4: N/A — nothing is refused; a wait only ends.

  describe('edge cases', () => {
    it('is quiet in a browser with no idle callback, after a short timeout', async () => {
      const { win } = fakeWindow(false)
      const quiet = createQuietTime(win, () => Date.now())
      const done = vi.fn()
      void quiet.whenQuiet().then(done)
      await vi.advanceTimersByTimeAsync(50)
      expect(done).toHaveBeenCalled()
    })

    it('no longer hears the reader once disposed', async () => {
      const { win, fire } = fakeWindow()
      const quiet = createQuietTime(win, () => Date.now())
      quiet.dispose()
      fire('keydown')
      const done = vi.fn()
      void quiet.whenQuiet().then(done)
      await vi.advanceTimersByTimeAsync(10)
      expect(done).toHaveBeenCalled()
    })
  })
})
