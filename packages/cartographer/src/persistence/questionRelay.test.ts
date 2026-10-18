import { describe, expect, it } from 'vitest'

import { createQuestionRelay } from './questionRelay'

/** A question that is not a draft offer, to show the relay serves any kind. */
interface ColourQuestion {
  /** The colour asked about. */
  colour: string
}

/*
 * The relay's behaviour in full — listeners, unsubscribe, a stray answer — is covered by
 * `draftOffers.test.ts`, which builds on it. This suite proves only what is generic about it.
 */
describe('createQuestionRelay', () => {
  describe('happy path', () => {
    it('holds a question of any kind until answered, and hands the answer back', async () => {
      const relay = createQuestionRelay<ColourQuestion>('busy')

      const answered = relay.ask({ colour: 'red' })
      expect(relay.current()).toEqual({ colour: 'red' })
      relay.answer(false)

      expect(await answered).toBe(false)
      expect(relay.current()).toBeNull()
    })
  })

  describe('variants', () => {
    it('takes a new question once the previous one is answered', async () => {
      const relay = createQuestionRelay<ColourQuestion>('busy')
      const first = relay.ask({ colour: 'red' })
      relay.answer(true)
      await first

      const second = relay.ask({ colour: 'blue' })
      expect(relay.current()).toEqual({ colour: 'blue' })
      relay.answer(true)

      expect(await second).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('refuses a second question while one waits, with the busy reason it was built with', async () => {
      const relay = createQuestionRelay<ColourQuestion>('a colour is already being asked')
      void relay.ask({ colour: 'red' })

      await expect(relay.ask({ colour: 'blue' })).rejects.toThrow('a colour is already being asked')
      expect(relay.current()).toEqual({ colour: 'red' })
    })
  })

  // L4: N/A — the relay holds no I/O; every failure path is the managed refusal above.

  describe('edge cases', () => {
    it('keeps a question whose value is falsy as the waiting one', () => {
      const relay = createQuestionRelay<number>('busy')
      void relay.ask(0)

      expect(relay.current()).toBe(0)
    })
  })
})
