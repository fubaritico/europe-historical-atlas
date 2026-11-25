import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { windowTimers } from './windowTimers'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('windowTimers', () => {
  describe('happy path', () => {
    it('runs a function after its delay', () => {
      const run = vi.fn()
      windowTimers.set(run, 2000)
      vi.advanceTimersByTime(1999)
      expect(run).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(run).toHaveBeenCalledOnce()
    })
  })

  describe('variants', () => {
    it('cancels a pending run by its handle', () => {
      const run = vi.fn()
      windowTimers.clear(windowTimers.set(run, 2000))
      vi.advanceTimersByTime(5000)
      expect(run).not.toHaveBeenCalled()
    })
  })

  // L3, L4, L5: N/A — the window's own timers, passed through.
})
