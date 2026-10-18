import { createQuestionRelay } from '../questionRelay'

import type { QuestionRelay } from '../questionRelay'

/**
 * The question *"resume the draft?"*, asked by the opening and answered in a dialogue (CARTO-238) — a
 * {@link QuestionRelay}, where yes resumes the draft and no sets it aside.
 */

/** What the author is asked about. */
export interface DraftOffer {
  /** The year the draft is of. */
  year: number
  /** When it was written, already worded for the author — *"today at 15:42"*. */
  when: string
}

/** The relay: `answer(true)` resumes the draft, `answer(false)` sets it aside. */
export type DraftOffers = QuestionRelay<DraftOffer>

/**
 * Build a relay with no question waiting.
 * @returns the relay
 */
export function createDraftOffers(): DraftOffers {
  return createQuestionRelay<DraftOffer>('a draft is already being offered')
}
