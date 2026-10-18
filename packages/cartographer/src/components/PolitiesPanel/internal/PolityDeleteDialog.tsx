import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { IconButton } from '@fubaritico/react/IconButton'
import { Modal } from '@fubaritico/react/Modal'

import { autofocusOnOpen } from '../../shared/hooks/autofocusOnOpen'
import { deletionQuestion } from '../polityDeletion'

import type { PendingDeletion } from '../polityDeletion'

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
 * @returns the dialogue
 */
export function PolityDeleteDialog({ pending, onConfirm, onCancel }: PolityDeleteDialogProps) {
  // Render
  return (
    <Modal isOpen={pending !== null} onClose={onCancel} aria-label="Delete polity">
      <div className="polity-delete">
        <Card>
          <Card.Header>
            Delete polity
            <IconButton type="button" icon="XMark" aria-label="Close" onClick={onCancel} />
          </Card.Header>
          <Card.Body>
            <p className="polity-delete__question">
              {pending === null ? '' : deletionQuestion(pending)}
            </p>
          </Card.Body>
          <Card.Footer align="end">
            <Button ref={autofocusOnOpen} type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={onConfirm}>
              Delete
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </Modal>
  )
}
