import { describe, expect, it, vi } from 'vitest'

import { createHistoryRelay } from './historyRelay'

describe('createHistoryRelay', () => {
  describe('happy path', () => {
    it('runs the registered answer in the asked direction', () => {
      const relay = createHistoryRelay(vi.fn())
      const answer = vi.fn()
      relay.register(answer)

      expect(relay.run('undo')).toBe(true)
      expect(relay.run('redo')).toBe(true)
      expect(answer.mock.calls).toEqual([['undo'], ['redo']])
    })
  })

  describe('variants', () => {
    it('runs the last answer registered', () => {
      const relay = createHistoryRelay(vi.fn())
      const first = vi.fn()
      const second = vi.fn()
      relay.register(first)
      relay.register(second)

      relay.run('undo')
      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledWith('undo')
    })
  })

  describe('managed errors', () => {
    it('refuses with a warning when no canvas is registered', () => {
      const warn = vi.fn()
      const relay = createHistoryRelay(warn)

      expect(relay.run('undo')).toBe(false)
      expect(warn).toHaveBeenCalledOnce()
      expect(String(warn.mock.calls[0]?.[0])).toContain('undo refused')
    })
  })

  describe('unmanaged errors', () => {
    it('lets an answer that throws propagate', () => {
      const relay = createHistoryRelay(vi.fn())
      relay.register(() => {
        throw new Error('boom')
      })
      expect(() => relay.run('redo')).toThrow('boom')
    })
  })

  describe('edge cases', () => {
    it('keeps the second answer when the first, already replaced, unregisters late', () => {
      // StrictMode mounts twice: the first controller's teardown can run after the second registered.
      const relay = createHistoryRelay(vi.fn())
      const unregisterFirst = relay.register(vi.fn())
      const second = vi.fn()
      relay.register(second)
      unregisterFirst()

      expect(relay.run('undo')).toBe(true)
      expect(second).toHaveBeenCalledOnce()
    })

    it('refuses again once the answer unregisters', () => {
      const warn = vi.fn()
      const relay = createHistoryRelay(warn)
      relay.register(vi.fn())()

      expect(relay.run('redo')).toBe(false)
      expect(warn).toHaveBeenCalledOnce()
    })
  })
})
