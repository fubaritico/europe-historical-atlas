import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { QUIET_AFTER_MS, createQuietTime } from './quietTime'

import type { Gesture, QuietWindow } from './quietTime'

/**
 * A window over fake timers, its listeners reachable.
 * @param idle - whether it offers `requestIdleCallback`
 * @returns the window and a way to fire its events
 */
function fakeWindow(idle = true) {
  const listeners = new Map<string, Set<(event?: Gesture) => void>>()
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
  const fire = (type: string, pointerId?: number): void => {
    const event = pointerId === undefined ? { type } : { type, pointerId }
    for (const listener of [...(listeners.get(type) ?? [])]) listener(event)
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
      const quiet = createQuietTime(win, win, () => Date.now())
      const done = vi.fn()
      void quiet.whenQuiet().then(done)
      await vi.advanceTimersByTimeAsync(10)
      expect(done).toHaveBeenCalled()
    })
  })

  describe('variants', () => {
    it('waits until the reader has left the map alone a moment', async () => {
      const { win, fire } = fakeWindow()
      const quiet = createQuietTime(win, win, () => Date.now())
      fire('keydown')
      const done = vi.fn()
      void quiet.whenQuiet().then(done)
      await vi.advanceTimersByTimeAsync(QUIET_AFTER_MS - 100)
      fire('wheel')
      await vi.advanceTimersByTimeAsync(QUIET_AFTER_MS - 100)
      expect(done).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(200)
      expect(done).toHaveBeenCalled()
    })

    // ATLAS-396, the dev, 2026-11-10: the mouse going to a button puts nothing off.
    it('counts the mouse moving for nothing', async () => {
      const { win, fire } = fakeWindow()
      const quiet = createQuietTime(win, win, () => Date.now())
      const done = vi.fn()
      void quiet.whenQuiet().then(done)
      fire('pointermove')
      await vi.advanceTimersByTimeAsync(10)
      expect(done).toHaveBeenCalled()
    })

    // A drag of the map is a press that lasts: never quiet while the button is down, however long.
    it('stays busy while a button is held, and quiet a moment after it is let go', async () => {
      const { win, fire } = fakeWindow()
      const quiet = createQuietTime(win, win, () => Date.now())
      fire('pointerdown')
      const done = vi.fn()
      void quiet.whenQuiet().then(done)
      await vi.advanceTimersByTimeAsync(5 * QUIET_AFTER_MS)
      expect(done).not.toHaveBeenCalled()
      fire('pointerup')
      await vi.advanceTimersByTimeAsync(QUIET_AFTER_MS + 100)
      expect(done).toHaveBeenCalled()
    })

    it('lets a press go when the browser cancels it', async () => {
      const { win, fire } = fakeWindow()
      const quiet = createQuietTime(win, win, () => Date.now())
      fire('pointerdown', 1)
      fire('pointercancel', 1)
      const done = vi.fn()
      void quiet.whenQuiet().then(done)
      await vi.advanceTimersByTimeAsync(QUIET_AFTER_MS + 100)
      expect(done).toHaveBeenCalled()
    })

    // The dev, 2026-11-10: a press on the interface — the frieze's slider dragged — holds nothing off.
    it('counts a press on the map, and none on the interface', async () => {
      const page = fakeWindow()
      const map = fakeWindow()
      const outcomes: boolean[] = []
      for (const fire of [map.fire, page.fire]) {
        const quiet = createQuietTime(page.win, map.win, () => Date.now())
        fire('pointerdown', 1)
        const done = vi.fn()
        void quiet.whenQuiet().then(done)
        await vi.advanceTimersByTimeAsync(5 * QUIET_AFTER_MS)
        outcomes.push(done.mock.calls.length > 0)
        quiet.dispose()
      }
      expect(outcomes).toEqual([false, true])
    })

    // Review ARCH-002: two fingers down, the first lifted — the drag goes on.
    it('stays busy while one of two pressed pointers is still down', async () => {
      const { win, fire } = fakeWindow()
      const quiet = createQuietTime(win, win, () => Date.now())
      fire('pointerdown', 1)
      fire('pointerdown', 2)
      fire('pointerup', 1)
      const done = vi.fn()
      void quiet.whenQuiet().then(done)
      await vi.advanceTimersByTimeAsync(5 * QUIET_AFTER_MS)
      expect(done).not.toHaveBeenCalled()
    })

    // Reviews ARCH-002, QUAL-005: a release the page never hears does not leave the map busy for good.
    it('lets every press go when the window loses the focus or a context menu opens', async () => {
      const outcomes: boolean[] = []
      for (const letGo of ['blur', 'contextmenu']) {
        const { win, fire } = fakeWindow()
        const quiet = createQuietTime(win, win, () => Date.now())
        fire('pointerdown', 1)
        fire(letGo)
        const done = vi.fn()
        void quiet.whenQuiet().then(done)
        await vi.advanceTimersByTimeAsync(QUIET_AFTER_MS + 100)
        outcomes.push(done.mock.calls.length > 0)
      }
      expect(outcomes).toEqual([true, true])
    })

    it('ends a sleep at once when the network comes back', async () => {
      const { win, fire } = fakeWindow()
      const quiet = createQuietTime(win, win, () => Date.now())
      const done = vi.fn()
      void quiet.sleep(30_000).then(done)
      fire('online')
      await vi.advanceTimersByTimeAsync(0)
      expect(done).toHaveBeenCalled()
    })

    it('ends a sleep after its time', async () => {
      const { win } = fakeWindow()
      const quiet = createQuietTime(win, win, () => Date.now())
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
      const quiet = createQuietTime(win, win, () => Date.now())
      const done = vi.fn()
      void quiet.whenQuiet().then(done)
      await vi.advanceTimersByTimeAsync(50)
      expect(done).toHaveBeenCalled()
    })

    // Review ARCH-003: a wait in flight at teardown ends, so the preparation behind it ends on its own check.
    it('ends a wait in flight when disposed, even with a button held', async () => {
      const { win, fire } = fakeWindow()
      const quiet = createQuietTime(win, win, () => Date.now())
      fire('pointerdown', 1)
      const done = vi.fn()
      void quiet.whenQuiet().then(done)
      await vi.advanceTimersByTimeAsync(QUIET_AFTER_MS)
      quiet.dispose()
      await vi.advanceTimersByTimeAsync(QUIET_AFTER_MS + 10)
      expect(done).toHaveBeenCalled()
    })

    it('no longer hears the reader once disposed', async () => {
      const { win, fire } = fakeWindow()
      const quiet = createQuietTime(win, win, () => Date.now())
      quiet.dispose()
      fire('keydown')
      const done = vi.fn()
      void quiet.whenQuiet().then(done)
      await vi.advanceTimersByTimeAsync(10)
      expect(done).toHaveBeenCalled()
    })
  })
})
