import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { Modal } from '@fubaritico/react/Modal'
import { useSyncExternalStore } from 'react'

import { autofocusOnOpen } from '../../hooks/autofocusOnOpen'
import { useTranslation } from '../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../i18n/actions'

import { ALARM_MESSAGES } from './i18n'

import type { AlarmBoard } from '../../../persistence/alarmBoard'

/**
 * What the year on disk says when the work may be lost or was not done — a save the server has not confirmed,
 * a failed save, drafts stopped (`persistence/notice.ts`). The dev's call, 2026-10-23: *« c'est visuel »*, not a
 * line in the status bar. Open while an alarm waits; every alarm waiting is shown, oldest first, under the topic
 * of the newest. ‹OK›, ‹escape› and the backdrop close it — each means the author has read it.
 */

/** What the dialogue needs. */
export interface AlarmDialogProps {
  /** The alarms waiting, raised by the persistence layer through the notice router. */
  alarms: AlarmBoard
}

/**
 * Render the alarms, open while one waits.
 * @param props - the board
 * @param props.alarms - the alarms waiting: it holds them and takes the author's ‹OK›
 * @returns the dialogue
 */
export function AlarmDialog({ alarms }: AlarmDialogProps) {
  // Context
  const t = useTranslation(ALARM_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // State
  const waiting = useSyncExternalStore(alarms.subscribe, alarms.current)

  // Derived
  const newest = waiting.at(-1)
  const title = newest === undefined ? '' : t('title', { topic: newest.topic })

  // Handlers
  const close = (): void => {
    alarms.dismiss()
  }

  // Render
  return (
    <Modal isOpen={newest !== undefined} onClose={close} aria-label={title}>
      <div className="short-dialogue">
        <Card>
          <Card.Header>{title}</Card.Header>
          <Card.Body>
            {waiting.map((alarm) => (
              <p key={alarm.topic} className="short-dialogue__text">
                {alarm.text}
              </p>
            ))}
          </Card.Body>
          <Card.Footer align="end">
            <Button ref={autofocusOnOpen} type="button" onClick={close}>
              {action('ok')}
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </Modal>
  )
}
