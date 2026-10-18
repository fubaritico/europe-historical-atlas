import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { useEffect, useState } from 'react'

import { reasonOf } from '../../../persistence/errorReason'
import { autofocusOnOpen } from '../../shared/hooks/autofocusOnOpen'

import { SnapshotList } from './SnapshotList'

import type { SnapshotEntry, SnapshotSource } from '../../../persistence/draftStore'
import type { Listing } from '../listing'

/** What the dialogue warns, every time it opens. */
const WARNING =
  'Opening a snapshot replaces the page you are working on. Your page is kept first as a snapshot: you will find it in this list.'

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
        if (current) setListing({ state: 'failed', reason: reasonOf(error) })
      }
    )
    return () => {
      current = false
    }
  }, [source, year])

  // Render
  return (
    <Card>
      <Card.Header>Open snapshot</Card.Header>
      <Card.Body>
        <p className="draft-recovery__question">{WARNING}</p>
        <SnapshotList listing={listing} chosen={chosen} choose={setChosen} year={year} now={now} />
      </Card.Body>
      <Card.Footer align="end">
        <Button ref={autofocusOnOpen} type="button" variant="secondary" onClick={close}>
          Cancel
        </Button>
        <Button type="button" onClick={openChosen} disabled={entry === undefined}>
          Open
        </Button>
      </Card.Footer>
    </Card>
  )
}
