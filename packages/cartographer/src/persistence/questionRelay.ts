/**
 * A yes-or-no question asked by code that runs outside React, and answered in a dialogue only React renders —
 * *"resume the draft?"*, *"overwrite the year changed on disk?"* (CARTO-238).
 *
 * **Why a relay, as for the result zone** (`resultRelay.ts`): the asker — the opening, a save — lives in the
 * entry module or a session built there, before any component exists. It `ask`s and waits; the dialogue reads
 * `current`, re-renders on `subscribe`, and calls `answer`. One shape for every such question, so two dialogues
 * cannot drift apart in how they wait.
 */

/** The relay, for one kind of question. */
export interface QuestionRelay<Question> {
  /**
   * Ask the author, and wait for the answer. One question at a time.
   * @param question - what is asked
   * @returns `true` for yes, `false` for no
   */
  ask: (question: Question) => Promise<boolean>
  /** The question waiting for an answer, or `null`. */
  current: () => Question | null
  /**
   * Listen to the question appearing and being answered.
   * @param listener - called on each change
   * @returns a function that stops listening
   */
  subscribe: (listener: () => void) => () => void
  /**
   * Answer the question waiting; nothing happens when none is.
   * @param yes - the answer
   */
  answer: (yes: boolean) => void
}

/**
 * Build a relay with no question waiting.
 * @param busy - the reason a second question is refused while one waits
 * @returns the relay
 */
export function createQuestionRelay<Question>(busy: string): QuestionRelay<Question> {
  let question: Question | null = null
  let settle: ((yes: boolean) => void) | null = null
  const listeners = new Set<() => void>()
  const notify = (): void => {
    for (const listener of listeners) listener()
  }
  return {
    ask: (next) => {
      if (settle !== null) return Promise.reject(new Error(busy))
      question = next
      const answered = new Promise<boolean>((resolve) => {
        settle = resolve
      })
      notify()
      return answered
    },
    current: () => question,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    answer: (yes) => {
      if (settle === null) return
      const resolve = settle
      settle = null
      question = null
      notify()
      resolve(yes)
    },
  }
}
