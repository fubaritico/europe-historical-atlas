import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { persistenceWords } from '../persistenceWords'

import { openWithDraft, saveAndClearDraft } from './draftSession'

import type { RecoveryOutcome } from './draftRecovery'

/** What the year on disk says, in English — the language these suites were written against. */
const EN_WORDS = persistenceWords('en')

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** Run the opening with the two steps answering as told, recording the order of events. */
async function opening(
  openYear: () => Promise<void> = () => Promise.resolve(),
  outcome: () => Promise<RecoveryOutcome> = () => Promise.resolve('clear')
) {
  const order: string[] = []
  const reports: string[] = []
  const keeper = { start: vi.fn(() => order.push('start')) }
  await openWithDraft({
    openYear: async () => {
      order.push('open')
      await openYear()
    },
    offerDraft: async () => {
      order.push('offer')
      return outcome()
    },
    keeper,
    report: (message) => reports.push(message),
    words: () => EN_WORDS,
  })
  return { order, reports, keeper }
}

describe('openWithDraft', () => {
  describe('happy path', () => {
    it('opens, then offers, then starts drafting — in that order', async () => {
      const { order } = await opening()

      expect(order).toEqual(['open', 'offer', 'start'])
    })
  })

  describe('variants', () => {
    it('leaves drafting off when an old draft is still in the way', async () => {
      const { keeper, reports } = await opening(undefined, () => Promise.resolve('draft-left'))

      expect(keeper.start).not.toHaveBeenCalled()
      // The offer has already said why and what to do; nothing is said twice.
      expect(reports).toEqual([])
      expect(console.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('managed errors', () => {
    it('says drafting is off when the offer rejects, and does not start it', async () => {
      const { keeper, reports } = await opening(undefined, () =>
        Promise.reject(new Error('unexpected'))
      )

      expect(keeper.start).not.toHaveBeenCalled()
      expect(reports).toEqual([
        'automatic drafts are off: the opening failed — save with ‹ctrl+S› (details in the console)',
      ])
    })
  })

  describe('unmanaged errors', () => {
    it('says drafting is off when the keeper itself cannot start, without rejecting', async () => {
      // Found in the second review (ARCH-002): a throwing start() rejected the chain into the void.
      const reports: string[] = []
      await openWithDraft({
        openYear: () => Promise.resolve(),
        offerDraft: () => Promise.resolve('clear'),
        keeper: {
          start: () => {
            throw new Error('no subscription')
          },
        },
        report: (message) => reports.push(message),
        words: () => EN_WORDS,
      })

      expect(reports).toEqual([
        'automatic drafts are off: they could not start — save with ‹ctrl+S› (details in the console)',
      ])
    })

    it('never rejects, even when opening the year throws', async () => {
      await expect(opening(() => Promise.reject(new Error('read failed')))).resolves.toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('does not offer before the year is open', async () => {
      let opened = false
      const offered: boolean[] = []
      await openWithDraft({
        openYear: async () => {
          await Promise.resolve()
          opened = true
        },
        offerDraft: () => {
          offered.push(opened)
          return Promise.resolve('clear')
        },
        keeper: { start: () => undefined },
        report: () => undefined,
        words: () => EN_WORDS,
      })

      expect(offered).toEqual([true])
    })
  })
})

describe('saveAndClearDraft', () => {
  describe('happy path', () => {
    it('tells the keeper the version the save took, once it is written', async () => {
      const keeper = { saved: vi.fn(() => Promise.resolve()) }

      await saveAndClearDraft({ version: () => 7, save: () => Promise.resolve(true), keeper })

      expect(keeper.saved).toHaveBeenCalledWith(7)
    })
  })

  describe('variants', () => {
    it('tells the keeper nothing when the save did not write', async () => {
      const keeper = { saved: vi.fn(() => Promise.resolve()) }

      await saveAndClearDraft({ version: () => 7, save: () => Promise.resolve(false), keeper })

      expect(keeper.saved).not.toHaveBeenCalled()
    })
  })

  // L3/L4: N/A — the save reports its own failures and resolves false; nothing here can throw.

  describe('edge cases', () => {
    it('reads the version before the save, not after — a gesture during the save keeps the draft', async () => {
      // The trap: reading it after would hand the keeper the newer version and remove a draft of newer work.
      let version = 7
      const keeper = { saved: vi.fn(() => Promise.resolve()) }

      await saveAndClearDraft({
        version: () => version,
        save: () => {
          version = 8
          return Promise.resolve(true)
        },
        keeper,
      })

      expect(keeper.saved).toHaveBeenCalledWith(7)
    })
  })
})
