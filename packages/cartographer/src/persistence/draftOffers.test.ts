import { describe, expect, it, vi } from 'vitest'

import { createDraftOffers } from './draftOffers'

/** The question asked in every test. */
const OFFER = { year: 1100, when: 'today at 15:42' }

describe('createDraftOffers', () => {
  describe('happy path', () => {
    it('holds the question until it is answered, and hands the answer back', async () => {
      const offers = createDraftOffers()

      const answered = offers.ask(OFFER)
      expect(offers.current()).toEqual(OFFER)
      offers.answer(true)

      expect(await answered).toBe(true)
      expect(offers.current()).toBeNull()
    })
  })

  describe('variants', () => {
    it('tells its listeners when the question appears and when it is answered', () => {
      const offers = createDraftOffers()
      const listener = vi.fn()
      offers.subscribe(listener)

      void offers.ask(OFFER)
      offers.answer(false)

      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('stops telling a listener that unsubscribed', () => {
      const offers = createDraftOffers()
      const listener = vi.fn()
      offers.subscribe(listener)()

      void offers.ask(OFFER)

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('managed errors', () => {
    it('refuses a second question while one waits', async () => {
      const offers = createDraftOffers()
      void offers.ask(OFFER)

      await expect(offers.ask(OFFER)).rejects.toThrow('a draft is already being offered')
    })
  })

  // L4: N/A — the relay holds no I/O; every failure path is the managed refusal above.

  describe('edge cases', () => {
    it('ignores an answer when no question waits', () => {
      const offers = createDraftOffers()
      const listener = vi.fn()
      offers.subscribe(listener)

      offers.answer(true)

      expect(listener).not.toHaveBeenCalled()
    })
  })
})
