import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { Modal } from '@fubaritico/react/Modal'
import { useSyncExternalStore } from 'react'

import { persistenceWords } from '../../../persistence/persistenceWords'
import { timeWords } from '../../../persistence/timeWords'
import { autofocusOnOpen } from '../../hooks/autofocusOnOpen'
import { useLocale } from '../../hooks/useLocale'
import { useTranslation } from '../../hooks/useTranslation'

import { DRAFT_RECOVERY_MESSAGES } from './i18n'

import type { DraftOffers } from '../../../persistence/draft/draftOffers'

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
  /** The clock, to word when the draft was kept. */
  now: () => Date
}

/**
 * Render the question, open while the opening waits for an answer.
 * @param props - the relay
 * @param props.now - the clock, to word when the draft was kept
 * @param props.offers - the relay the opening asks through: it holds the pending draft and takes the answer
 * @returns the dialogue
 */
export function DraftRecoveryDialog({ offers, now }: DraftRecoveryDialogProps) {
  // Context
  const t = useTranslation(DRAFT_RECOVERY_MESSAGES)
  const locale = useLocale()

  // State
  const offer = useSyncExternalStore(offers.subscribe, offers.current)

  // Derived
  const words = persistenceWords(locale)

  // Handlers
  const resume = (): void => {
    offers.answer(true)
  }
  const setAside = (): void => {
    offers.answer(false)
  }

  // Render
  return (
    <Modal isOpen={offer !== null} onClose={setAside} aria-label={t('title')}>
      <div className="draft-recovery">
        <Card>
          <Card.Header>{t('title')}</Card.Header>
          <Card.Body>
            <p className="draft-recovery__question">
              {offer === null
                ? ''
                : t('question', {
                    year: String(offer.year),
                    when: timeWords(offer.savedAt, now(), words),
                  })}
            </p>
          </Card.Body>
          <Card.Footer align="end">
            <Button type="button" variant="secondary" onClick={setAside}>
              {t('setAside')}
            </Button>
            <Button ref={autofocusOnOpen} type="button" onClick={resume}>
              {t('resume')}
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </Modal>
  )
}
