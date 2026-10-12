import { describe, expect, it, vi } from 'vitest'

import { createResultRelay } from './resultRelay'

describe('createResultRelay', () => {
  describe('happy path', () => {
    it('hands a message to the attached writer', () => {
      const relay = createResultRelay()
      const writer = vi.fn()
      relay.attach(writer)
      relay.say('saved 1100')

      expect(writer).toHaveBeenCalledWith('saved 1100')
    })
  })

  describe('variants', () => {
    it('keeps a message said before any writer, and hands it over on attaching', () => {
      // The start-up read can finish before the page mounts; its answer must not vanish.
      const relay = createResultRelay()
      relay.say('opened 1100')
      const writer = vi.fn()
      relay.attach(writer)

      expect(writer).toHaveBeenCalledWith('opened 1100')
    })

    it('keeps only the latest of several messages said before attaching', () => {
      const relay = createResultRelay()
      relay.say('first')
      relay.say('second')
      const writer = vi.fn()
      relay.attach(writer)

      expect(writer.mock.calls).toEqual([['second']])
    })
  })

  // L3: N/A — nothing is refused.
  // L4: N/A — no async work.

  describe('edge cases', () => {
    it('hands a kept message over once, not again to the next writer', () => {
      const relay = createResultRelay()
      relay.say('opened 1100')
      relay.attach(vi.fn())()
      const second = vi.fn()
      relay.attach(second)

      expect(second).not.toHaveBeenCalled()
    })

    it('keeps messages again once the writer detaches — StrictMode attaches twice', () => {
      const relay = createResultRelay()
      const detach = relay.attach(vi.fn())
      detach()
      relay.say('saved 1100')
      const writer = vi.fn()
      relay.attach(writer)

      expect(writer).toHaveBeenCalledWith('saved 1100')
    })

    it('ignores a stale detach that would remove a newer writer', () => {
      const relay = createResultRelay()
      const detachFirst = relay.attach(vi.fn())
      const second = vi.fn()
      relay.attach(second)
      detachFirst()
      relay.say('saved 1100')

      expect(second).toHaveBeenCalledWith('saved 1100')
    })
  })
})
