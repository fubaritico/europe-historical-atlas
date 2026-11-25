import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { Modal } from '@fubaritico/react/Modal'
import { useSyncExternalStore } from 'react'

import { autofocusOnOpen } from '../../hooks/autofocusOnOpen'
import { useTranslation } from '../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../i18n/actions'

import { SAVE_FIRST_MESSAGES } from './i18n'

import type { SaveFirstAnswer, SaveFirstReason } from '../../../persistence/mapChange'
import type { QuestionRelay } from '../../../persistence/questionRelay'

/**
 * The question *Open…* asks when the map open holds changes (`s19`, the dev's words, 2026-11-02): *"You are about to
 * open this map. Save the current map?"* — [Yes] saves, then opens; [No] opens without saving.
 *
 * **[Yes] takes the focus**: ‹enter› pressed by reflex keeps the work. ‹escape› and a click on the backdrop answer
 * neither — nothing is opened, the map stays (every dialogue of the Cartographer closes so; Claude's proposal, in `s19`).
 */

/** What the dialogue needs. */
export interface SaveFirstDialogProps {
  /**
   * The relay *Open…* and « Se déconnecter » ask through (CARTO-535), with why — the map about to be opened, or
   * signing out.
   */
  questions: QuestionRelay<SaveFirstReason, SaveFirstAnswer>
}

/**
 * Render the question, open while *Open…* or « Se déconnecter » waits for an answer.
 * @param props - the relay
 * @param props.questions - the relay: it holds why the question is asked and takes the answer
 * @returns the dialogue
 */
export function SaveFirstDialog({ questions }: SaveFirstDialogProps) {
  // Context
  const t = useTranslation(SAVE_FIRST_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // State
  const reason = useSyncExternalStore(questions.subscribe, questions.current)

  // Derived
  const title = reason?.kind === 'signOut' ? t('signOutTitle') : t('title')
  const question =
    reason === null
      ? ''
      : reason.kind === 'signOut'
        ? t('signOutQuestion')
        : t('question', { map: reason.map })

  // Handlers
  const yes = (): void => {
    questions.answer('yes')
  }
  const no = (): void => {
    questions.answer('no')
  }
  const dismiss = (): void => {
    questions.answer('cancel')
  }

  // Render
  return (
    <Modal isOpen={reason !== null} onClose={dismiss} aria-label={title}>
      <div className="short-dialogue">
        <Card>
          <Card.Header>{title}</Card.Header>
          <Card.Body>
            <p className="short-dialogue__text">{question}</p>
          </Card.Body>
          <Card.Footer align="end">
            <Button type="button" variant="secondary" onClick={no}>
              {action('no')}
            </Button>
            <Button ref={autofocusOnOpen} type="button" onClick={yes}>
              {action('yes')}
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </Modal>
  )
}
