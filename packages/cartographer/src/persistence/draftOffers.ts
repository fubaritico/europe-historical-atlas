/**
 * The question *"resume the draft?"*, asked by the opening and answered in a dialogue (CARTO-238).
 *
 * **Why a relay, as for the result zone** (`resultRelay.ts`): the opening runs in the entry module, before
 * any component exists, and the answer comes from a dialogue only React renders. The opening `ask`s and
 * waits; the dialogue reads `current`, re-renders on `subscribe`, and calls `answer`.
 */

/** What the author is asked about. */
export interface DraftOffer {
  /** The year the draft is of. */
  year: number
  /** When it was written, already worded for the author — *"today at 15:42"*. */
  when: string
}

/** The relay. */
export interface DraftOffers {
  /**
   * Ask the author, and wait for the answer. One question at a time.
   * @param offer - the draft offered
   * @returns `true` to resume it, `false` to set it aside
   */
  ask: (offer: DraftOffer) => Promise<boolean>
  /** The question waiting for an answer, or `null`. */
  current: () => DraftOffer | null
  /**
   * Listen to the question appearing and being answered.
   * @param listener - called on each change
   * @returns a function that stops listening
   */
  subscribe: (listener: () => void) => () => void
  /**
   * Answer the question waiting; nothing happens when none is.
   * @param resume - `true` to resume the draft
   */
  answer: (resume: boolean) => void
}

/**
 * Build a relay with no question waiting.
 * @returns the relay
 */
export function createDraftOffers(): DraftOffers {
  let offer: DraftOffer | null = null
  let settle: ((resume: boolean) => void) | null = null
  const listeners = new Set<() => void>()
  const notify = (): void => {
    for (const listener of listeners) listener()
  }
  return {
    ask: (next) => {
      if (settle !== null) return Promise.reject(new Error('a draft is already being offered'))
      offer = next
      const answered = new Promise<boolean>((resolve) => {
        settle = resolve
      })
      notify()
      return answered
    },
    current: () => offer,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    answer: (resume) => {
      if (settle === null) return
      const resolve = settle
      settle = null
      offer = null
      notify()
      resolve(resume)
    },
  }
}
