import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { Modal } from '@fubaritico/react/Modal'
import { useSyncExternalStore } from 'react'

import { autofocusOnOpen } from '../../hooks/autofocusOnOpen'
import { useTranslation } from '../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../i18n/actions'

import { SAVE_FIRST_MESSAGES } from './i18n'

import type { SaveFirstAnswer } from '../../../persistence/mapChange'
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
  /** The relay *Open…* asks through, with the name of the map about to be opened. */
  questions: QuestionRelay<string, SaveFirstAnswer>
}

/**
 * Render the question, open while *Open…* waits for an answer.
 * @param props - the relay
 * @param props.questions - the relay: it holds the map about to be opened and takes the answer
 * @returns the dialogue
 */
export function SaveFirstDialog({ questions }: SaveFirstDialogProps) {
  // Context
  const t = useTranslation(SAVE_FIRST_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // State
  const map = useSyncExternalStore(questions.subscribe, questions.current)

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
    <Modal isOpen={map !== null} onClose={dismiss} aria-label={t('title')}>
      <div className="short-dialogue">
        <Card>
          <Card.Header>{t('title')}</Card.Header>
          <Card.Body>
            <p className="short-dialogue__text">{map === null ? '' : t('question', { map })}</p>
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
