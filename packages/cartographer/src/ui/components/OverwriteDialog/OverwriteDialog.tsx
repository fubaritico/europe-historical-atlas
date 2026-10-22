import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { Modal } from '@fubaritico/react/Modal'
import { useSyncExternalStore } from 'react'

import { persistenceWords } from '../../../persistence/persistenceWords'
import { timeWords } from '../../../persistence/timeWords'
import { autofocusOnOpen } from '../../hooks/autofocusOnOpen'
import { useLocale } from '../../hooks/useLocale'
import { useTranslation } from '../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../i18n/actions'

import { OVERWRITE_MESSAGES } from './i18n'

import type { QuestionRelay } from '../../../persistence/questionRelay'
import type { OverwriteQuestion } from '../../../persistence/yearSession'

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
  /** The clock, to word when the year changed. */
  now: () => Date
}

/**
 * Render the question, open while a save waits for an answer.
 * @param props - the relay
 * @param props.questions - the relay the save asks through: it holds the pending question and takes the answer
 * @param props.now - the clock, to word when the year changed
 * @returns the dialogue
 */
export function OverwriteDialog({ questions, now }: OverwriteDialogProps) {
  // Context
  const t = useTranslation(OVERWRITE_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)
  const locale = useLocale()

  // State
  const question = useSyncExternalStore(questions.subscribe, questions.current)

  // Derived
  const words = persistenceWords(locale)

  // Handlers
  const overwrite = (): void => {
    questions.answer(true)
  }
  const cancel = (): void => {
    questions.answer(false)
  }

  // Render
  return (
    <Modal isOpen={question !== null} onClose={cancel} aria-label={t('title')}>
      <div className="draft-recovery">
        <Card>
          <Card.Header>{t('title')}</Card.Header>
          <Card.Body>
            <p className="draft-recovery__question">
              {question === null
                ? ''
                : t('question', {
                    known: question.changedAt === null ? 'no' : 'yes',
                    year: String(question.year),
                    when:
                      question.changedAt === null
                        ? ''
                        : timeWords(question.changedAt, now(), words),
                  })}
            </p>
          </Card.Body>
          <Card.Footer align="end">
            <Button type="button" variant="secondary" onClick={overwrite}>
              {t('overwrite')}
            </Button>
            <Button ref={autofocusOnOpen} type="button" onClick={cancel}>
              {action('cancel')}
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </Modal>
  )
}
