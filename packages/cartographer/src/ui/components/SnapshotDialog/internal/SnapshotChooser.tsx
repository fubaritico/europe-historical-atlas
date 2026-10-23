import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { useEffect, useState } from 'react'

import { autofocusOnOpen } from '../../../hooks/autofocusOnOpen'
import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { SNAPSHOT_DIALOG_MESSAGES } from '../i18n'

import { SnapshotList } from './SnapshotList'

import type { SnapshotEntry, SnapshotSource } from '../../../../persistence/draft/draftStore'
import type { Listing } from '../listing'

/** What the dialogue's content needs. */
export interface SnapshotChooserProps {
  /** Where the list is read from. */
  source: Pick<SnapshotSource, 'listSnapshots'>
  /** The year being edited. */
  year: number
  /** The clock, to word each snapshot's time. */
  now: () => Date
  /**
   * Open the snapshot chosen — keep the page first, then replace it (`persistence/snapshotOpening.ts`).
   * @param entry - the snapshot chosen
   */
  onOpen: (entry: SnapshotEntry) => void
  /** Close the dialogue. */
  close: () => void
}

/**
 * The dialogue's content, mounted for one opening: it reads the list, holds the choice, and opens.
 * @param props - the source, the year, the clock, what opening and closing do
 * @param props.source - where the list is read from
 * @param props.year - the year
 * @param props.now - the clock
 * @param props.onOpen - open the snapshot chosen
 * @param props.close - close the dialogue
 * @returns the card
 */
export function SnapshotChooser({ source, year, now, onOpen, close }: SnapshotChooserProps) {
  // Context
  const t = useTranslation(SNAPSHOT_DIALOG_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // State
  const [listing, setListing] = useState<Listing>({ state: 'reading' })
  const [chosen, setChosen] = useState<string | null>(null)

  // Derived
  const entry =
    listing.state === 'read' ? listing.entries.find((item) => item.name === chosen) : undefined

  // Handlers
  const openChosen = (): void => {
    if (entry === undefined) return
    close()
    onOpen(entry)
  }

  // Effects
  useEffect(() => {
    let current = true
    source.listSnapshots(year).then(
      (entries) => {
        if (current) setListing({ state: 'read', entries })
      },
      (error: unknown) => {
        console.error(`[Cartographer] the snapshots of ${String(year)} could not be listed`, error)
        if (current) setListing({ state: 'failed' })
      }
    )
    return () => {
      current = false
    }
  }, [source, year])

  // Render
  return (
    <Card>
      <Card.Header>{t('title')}</Card.Header>
      <Card.Body>
        <p className="short-dialogue__text">{t('warning')}</p>
        <SnapshotList listing={listing} chosen={chosen} choose={setChosen} year={year} now={now} />
      </Card.Body>
      <Card.Footer align="end">
        <Button ref={autofocusOnOpen} type="button" variant="secondary" onClick={close}>
          {action('cancel')}
        </Button>
        <Button type="button" onClick={openChosen} disabled={entry === undefined}>
          {t('open')}
        </Button>
      </Card.Footer>
    </Card>
  )
}
