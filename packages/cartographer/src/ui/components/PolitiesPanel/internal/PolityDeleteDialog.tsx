import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { IconButton } from '@fubaritico/react/IconButton'
import { Modal } from '@fubaritico/react/Modal'

import { autofocusOnOpen } from '../../../hooks/autofocusOnOpen'
import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { POLITIES_PANEL_MESSAGES } from '../i18n'
import { deletionQuestion } from '../utils/polityDeletion'

import type { PendingDeletion } from '../utils/polityDeletion'

/**
 * The confirmation before a polity is deleted — `s07`'s D2, the dev's call of 2026-10-12: *every deletion is
 * confirmed*, and the question says what goes. Still one undo step afterwards.
 *
 * **`[Cancel]` takes the focus**, so ‹enter› pressed by reflex keeps the polity: the destructive choice is
 * the one that has to be reached for. A click on the backdrop does not delete either — it closes, as Cancel
 * does.
 */

/** What the confirmation needs. */
export interface PolityDeleteDialogProps {
  /** The polity about to be deleted and what goes with it; `null` keeps the dialogue closed. */
  pending: PendingDeletion | null
  /** Delete it. */
  onConfirm: () => void
  /** Keep it. */
  onCancel: () => void
}

/**
 * Render the confirmation.
 * @param props - the polity, and the two answers
 * @param props.pending - the polity about to be deleted and what goes with it; `null` keeps the dialogue closed
 * @param props.onConfirm - deletes the polity, called by `[Delete]`
 * @param props.onCancel - keeps the polity, called by `[Cancel]`, the cross, ‹escape› or the backdrop
 * @returns the dialogue
 */
export function PolityDeleteDialog({ pending, onConfirm, onCancel }: PolityDeleteDialogProps) {
  // Context
  const t = useTranslation(POLITIES_PANEL_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // Render
  return (
    <Modal isOpen={pending !== null} onClose={onCancel} aria-label={action('deletePolity')}>
      <div className="polity-delete">
        <Card>
          <Card.Header>
            {action('deletePolity')}
            <IconButton
              type="button"
              icon="XMark"
              aria-label={action('close')}
              onClick={onCancel}
            />
          </Card.Header>
          <Card.Body>
            <p className="polity-delete__question">
              {pending === null ? '' : deletionQuestion(pending, t)}
            </p>
          </Card.Body>
          <Card.Footer align="end">
            <Button ref={autofocusOnOpen} type="button" variant="secondary" onClick={onCancel}>
              {action('cancel')}
            </Button>
            <Button type="button" onClick={onConfirm}>
              {action('delete')}
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </Modal>
  )
}
