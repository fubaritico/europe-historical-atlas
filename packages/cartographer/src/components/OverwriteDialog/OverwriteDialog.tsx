import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { Modal } from '@fubaritico/react/Modal'
import { useSyncExternalStore } from 'react'

import { autofocusOnOpen } from '../shared/hooks/autofocusOnOpen'

import type { QuestionRelay } from '../../persistence/questionRelay'
import type { OverwriteQuestion } from '../../persistence/yearSession'

/**
 * The question asked by ‹ctrl+S› when the year changed on disk since the page opened it (CARTO-238, rung 3):
 * *"1100 was changed on disk today at 14:02, since it was opened. Overwrite it with this page?"*
 *
 * **`[Cancel]` takes the focus**: overwriting throws away whatever wrote the files — the opposite of the draft's
 * dialogue, whose default gives work back. ‹enter› pressed by reflex must not destroy anything; ‹escape› and a
 * click on the backdrop cancel too. The dev's call, 2026-10-18: these two answers and nothing else.
 */

/** What the dialogue needs. */
export interface OverwriteDialogProps {
  /** The relay the save asks through: `true` overwrites, `false` cancels. */
  questions: QuestionRelay<OverwriteQuestion>
}

/**
 * The question, worded for the author.
 * @param question - the year and when it changed
 * @returns the sentence
 */
function overwriteSentence(question: OverwriteQuestion): string {
  const year = String(question.year)
  const changed =
    question.when === null
      ? `${year} is no longer on disk as it was opened`
      : `${year} was changed on disk ${question.when}, since it was opened`
  return `${changed}. Overwrite it with this page?`
}

/**
 * Render the question, open while a save waits for an answer.
 * @param props - the relay
 * @returns the dialogue
 */
export function OverwriteDialog({ questions }: OverwriteDialogProps) {
  // State
  const question = useSyncExternalStore(questions.subscribe, questions.current)

  // Handlers
  const overwrite = (): void => {
    questions.answer(true)
  }
  const cancel = (): void => {
    questions.answer(false)
  }

  // Render
  return (
    <Modal isOpen={question !== null} onClose={cancel} aria-label="The year changed on disk">
      <div className="draft-recovery">
        <Card>
          <Card.Header>The year changed on disk</Card.Header>
          <Card.Body>
            <p className="draft-recovery__question">
              {question === null ? '' : overwriteSentence(question)}
            </p>
          </Card.Body>
          <Card.Footer align="end">
            <Button type="button" variant="secondary" onClick={overwrite}>
              Overwrite
            </Button>
            <Button ref={autofocusOnOpen} type="button" onClick={cancel}>
              Cancel
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </Modal>
  )
}
