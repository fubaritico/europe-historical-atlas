import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { failAddition, settleAddition } from './settleAddition'

import type { AdditionSink } from './settleAddition'

/**
 * A sink whose every gesture is a spy.
 * @param fields - what to change: the dialogue closed, another item offered
 * @returns the sink
 */
function sinkWith(fields: { open?: boolean; offered?: string | null } = {}) {
  return {
    open: () => fields.open ?? true,
    offeredNow: () => (fields.offered === undefined ? 'Q272033' : fields.offered),
    sessionLost: vi.fn(),
    cmsOffline: vi.fn(),
    onField: vi.fn<AdditionSink['onField']>(),
    setSending: vi.fn(),
    setOutcome: vi.fn(),
  }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('settleAddition', () => {
  describe('happy path', () => {
    it('ties the polity to the territory created, and says it', () => {
      const sink = sinkWith()
      const result = { kind: 'linked', id: 512, created: true } as const

      settleAddition(result, 'Q272033', sink)

      expect(sink.onField).toHaveBeenCalledWith('territory', '512')
      expect(sink.setOutcome).toHaveBeenCalledWith(result)
      expect(sink.setSending).toHaveBeenCalledWith(false)
    })
  })

  describe('variants', () => {
    it('opens the session dialogue on a session refused, and ties nothing', () => {
      const sink = sinkWith()

      settleAddition({ kind: 'signedOut' }, 'Q272033', sink)

      expect(sink.sessionLost).toHaveBeenCalledTimes(1)
      expect(sink.cmsOffline).not.toHaveBeenCalled()
      expect(sink.onField).not.toHaveBeenCalled()
      expect(sink.setOutcome).toHaveBeenCalledWith({ kind: 'signedOut' })
    })

    it('says the CMS not started, and ties nothing', () => {
      const sink = sinkWith()

      settleAddition({ kind: 'offline' }, 'Q272033', sink)

      expect(sink.onField).not.toHaveBeenCalled()
      expect(sink.sessionLost).not.toHaveBeenCalled()
      expect(sink.cmsOffline).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('wrote nothing: offline'))
    })
  })

  describe('managed errors', () => {
    it('ties nothing when the form names another item now, and says why', () => {
      const sink = sinkWith({ offered: 'Q1' })

      settleAddition({ kind: 'linked', id: 512, created: true }, 'Q272033', sink)

      expect(sink.onField).not.toHaveBeenCalled()
      expect(sink.setOutcome).toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('not tied'))
    })
  })

  describe('unmanaged errors', () => {
    it('says a failure of the dev server loudly, and as a refusal', () => {
      const sink = sinkWith()

      failAddition(new TypeError('Failed to fetch'), sink)

      expect(console.error).toHaveBeenCalled()
      expect(sink.setOutcome).toHaveBeenCalledWith({ kind: 'refused', reason: 'Failed to fetch' })
    })

    it('says a failure that is not an Error by its text', () => {
      const sink = sinkWith()

      failAddition('gone', sink)

      expect(sink.setOutcome).toHaveBeenCalledWith({ kind: 'refused', reason: 'gone' })
    })
  })

  describe('edge cases', () => {
    it('still opens the session dialogue when the polity dialogue was closed, and writes nothing else', () => {
      const sink = sinkWith({ open: false })

      settleAddition({ kind: 'signedOut' }, 'Q272033', sink)

      expect(sink.sessionLost).toHaveBeenCalledTimes(1)
      expect(sink.setOutcome).not.toHaveBeenCalled()
    })

    it('still opens the alarm when the CMS does not answer after the polity dialogue closed', () => {
      const sink = sinkWith({ open: false })

      settleAddition({ kind: 'offline' }, 'Q272033', sink)

      expect(sink.cmsOffline).toHaveBeenCalledTimes(1)
      expect(sink.setOutcome).not.toHaveBeenCalled()
    })

    it('ties nothing when the form offers no item any more', () => {
      const sink = sinkWith({ offered: null })

      settleAddition({ kind: 'linked', id: 42, created: false }, 'Q272033', sink)

      expect(sink.onField).not.toHaveBeenCalled()
    })

    it('a failure after the dialogue closed is still said on the console, and nothing else', () => {
      const sink = sinkWith({ open: false })

      failAddition(new Error('boom'), sink)

      expect(console.error).toHaveBeenCalled()
      expect(sink.setOutcome).not.toHaveBeenCalled()
    })
  })
})
