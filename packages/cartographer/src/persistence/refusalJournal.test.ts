import { describe, expect, it, vi } from 'vitest'

import { journalRefusals } from './refusalJournal'

import type { JournalEntry, RefusalConsole } from './refusalJournal'

/**
 * A stand-in console and what the journal received.
 * @returns the console, its own two methods, and the entries sent
 */
function setUp() {
  const warn = vi.fn()
  const error = vi.fn()
  const target: RefusalConsole = { warn, error }
  const sent: JournalEntry[] = []
  const stop = journalRefusals(target, (entry) => sent.push(entry))
  return { target, warn, error, sent, stop }
}

describe('journalRefusals', () => {
  describe('happy path', () => {
    it('sends a refusal of the Cartographer to the journal and still writes it to the console', () => {
      const { target, warn, sent } = setUp()
      target.warn('[Cartographer] the outline was not closed: a ring needs at least three anchors.')
      expect(warn).toHaveBeenCalledWith(
        '[Cartographer] the outline was not closed: a ring needs at least three anchors.'
      )
      expect(sent).toEqual([
        {
          level: 'warn',
          message:
            '[Cartographer] the outline was not closed: a ring needs at least three anchors.',
        },
      ])
    })
  })

  describe('variants', () => {
    it('sends an error as an error, its arguments joined', () => {
      const { target, error, sent } = setUp()
      target.error('[Cartographer] not carved:', 'the difference could not be computed')
      expect(error).toHaveBeenCalledOnce()
      expect(sent).toEqual([
        {
          level: 'error',
          message: '[Cartographer] not carved: the difference could not be computed',
        },
      ])
    })

    it('writes an error by its message and an object as JSON, never [object Object]', () => {
      const { target, sent } = setUp()
      target.error('[Cartographer] not saved:', new TypeError('Failed to fetch'), { map: '1100' })
      expect(sent[0]?.message).toBe(
        '[Cartographer] not saved: TypeError: Failed to fetch {"map":"1100"}'
      )
    })

    it('writes an object JSON cannot write as plain text, and still writes to the console', () => {
      const { target, warn, sent } = setUp()
      const loop: Record<string, unknown> = {}
      loop.self = loop
      target.warn('[Cartographer] a loop:', loop)
      expect([warn.mock.calls.length, sent[0]?.message]).toEqual([
        1,
        '[Cartographer] a loop: [object Object]',
      ])
    })
  })

  describe('managed errors', () => {
    it('leaves what is not the Cartographer’s in the console alone — React, a library, an object', () => {
      const { target, warn, sent } = setUp()
      target.warn('Warning: Each child in a list should have a unique "key" prop.')
      target.warn({ tag: '[Cartographer]' })
      expect([warn.mock.calls.length, sent]).toEqual([2, []])
    })
  })

  // L4: N/A — the sender is Vite's socket, which queues while it is closed; nothing here awaits it.

  describe('edge cases', () => {
    it('puts the console back when stopped, and sends nothing more', () => {
      const { target, warn, sent, stop } = setUp()
      stop()
      target.warn('[Cartographer] after the stop')
      expect([target.warn, sent]).toEqual([warn, []])
    })
  })
})
