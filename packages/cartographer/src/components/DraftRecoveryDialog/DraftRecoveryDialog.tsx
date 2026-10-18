import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { Modal } from '@fubaritico/react/Modal'
import { useSyncExternalStore } from 'react'

import { autofocusOnOpen } from '../shared/hooks/autofocusOnOpen'

import type { DraftOffers } from '../../persistence/draftOffers'

/**
 * The question asked at the opening when the previous session left a draft — work it never saved
 * (CARTO-238): *"Resume the draft of 1100 from today at 15:42?"*
 *
 * **`[Resume]` takes the focus**: the dialogue exists so that nothing is lost, and ‹enter› pressed by reflex
 * should give the work back. **Neither answer destroys anything**: resuming opens the draft without touching
 * the disk, and `[Set it aside]` — like ‹escape› or a click on the backdrop — keeps it under a dated name.
 */

/** What the dialogue needs. */
export interface DraftRecoveryDialogProps {
  /** The relay the opening asks through. */
  offers: DraftOffers
}

/**
 * Render the question, open while the opening waits for an answer.
 * @param props - the relay
 * @returns the dialogue
 */
export function DraftRecoveryDialog({ offers }: DraftRecoveryDialogProps) {
  // State
  const offer = useSyncExternalStore(offers.subscribe, offers.current)

  // Handlers
  const resume = (): void => {
    offers.answer(true)
  }
  const setAside = (): void => {
    offers.answer(false)
  }

  // Render
  return (
    <Modal isOpen={offer !== null} onClose={setAside} aria-label="Unsaved work found">
      <div className="draft-recovery">
        <Card>
          <Card.Header>Unsaved work found</Card.Header>
          <Card.Body>
            <p className="draft-recovery__question">
              {offer === null
                ? ''
                : `A draft of ${String(offer.year)} was kept ${offer.when}, with work that was never saved. Resume it?`}
            </p>
          </Card.Body>
          <Card.Footer align="end">
            <Button type="button" variant="secondary" onClick={setAside}>
              Set it aside
            </Button>
            <Button ref={autofocusOnOpen} type="button" onClick={resume}>
              Resume
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </Modal>
  )
}
