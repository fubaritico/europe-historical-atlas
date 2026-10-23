import { describe, expect, it, vi } from 'vitest'

import { awaitConfirmation } from './awaitConfirmation'

import type { ConfirmationTimers } from './awaitConfirmation'

/** Timers run by hand: `elapse` fires whatever is due. */
function manualTimers() {
  let clock = 0
  let next = 1
  const due = new Map<number, { at: number; run: () => void }>()
  const timers: ConfirmationTimers = {
    set: (run, delayMs) => {
      const handle = next++
      due.set(handle, { at: clock + delayMs, run })
      return handle
    },
    clear: (handle) => {
      due.delete(handle)
    },
  }
  const elapse = (ms: number): void => {
    clock += ms
    for (const [handle, timer] of [...due]) {
      if (timer.at > clock) continue
      due.delete(handle)
      timer.run()
    }
  }
  return { timers, elapse, pending: () => due.size }
}

/** A write the test settles by hand. */
function heldWrite() {
  let settle: { resolve: (value: string) => void; reject: (error: Error) => void } | undefined
  const write = new Promise<string>((resolve, reject) => {
    settle = { resolve, reject }
  })
  return {
    write,
    resolve: (value: string) => settle?.resolve(value),
    reject: (error: Error) => settle?.reject(error),
  }
}

describe('awaitConfirmation', () => {
  describe('happy path', () => {
    it('returns the confirmation and says nothing when it comes in time', async () => {
      const { timers, elapse, pending } = manualTimers()
      const late = vi.fn()
      const held = heldWrite()
      const waiting = awaitConfirmation(held.write, { timers, delayMs: 10_000, late })
      elapse(9_999)
      held.resolve('stamp')
      await expect(waiting).resolves.toBe('stamp')
      elapse(10_000)
      expect(late).not.toHaveBeenCalled()
      expect(pending()).toBe(0)
    })
  })

  describe('variants', () => {
    // The dev's rule: no confirmation within the delay is said — and the write is not cut.
    it('says the write is late, and still returns its confirmation when it comes', async () => {
      const { timers, elapse } = manualTimers()
      const late = vi.fn()
      const held = heldWrite()
      const waiting = awaitConfirmation(held.write, { timers, delayMs: 10_000, late })
      elapse(10_000)
      expect(late).toHaveBeenCalledTimes(1)
      held.resolve('stamp')
      await expect(waiting).resolves.toBe('stamp')
    })
  })

  describe('managed errors', () => {
    it('passes a failed write through and stops the clock', async () => {
      const { timers, elapse, pending } = manualTimers()
      const late = vi.fn()
      const held = heldWrite()
      const waiting = awaitConfirmation(held.write, { timers, delayMs: 10_000, late })
      held.reject(new Error('refused'))
      await expect(waiting).rejects.toThrow('refused')
      elapse(10_000)
      expect(late).not.toHaveBeenCalled()
      expect(pending()).toBe(0)
    })
  })

  // L4: N/A — the module awaits one promise and calls one function; a throw from either is the caller's.

  describe('edge cases', () => {
    it('says it once, however long the write waits', () => {
      const { timers, elapse } = manualTimers()
      const late = vi.fn()
      void awaitConfirmation(heldWrite().write, { timers, delayMs: 10_000, late })
      elapse(10_000)
      elapse(60_000)
      expect(late).toHaveBeenCalledTimes(1)
    })
  })
})
