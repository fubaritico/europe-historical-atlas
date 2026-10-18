import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { Modal } from '@fubaritico/react/Modal'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { reasonOf } from '../persistence/errorReason'
import { timeWords } from '../persistence/timeWords'

import { autofocusOnOpen } from './autofocusOnOpen'

import type { SnapshotPicker } from './snapshotPicker'
import type { SnapshotEntry, SnapshotSource } from '../persistence/draftStore'

/**
 * *Open snapshot* (CARTO-238, rung 2b): the year's kept snapshots, newest first, one to choose, and a warning
 * that says what happens — the page is replaced, and kept first, to be found in this same list. It says what is
 * possible, never where a file lies (the dev, 2026-10-18).
 *
 * **The content mounts only while the dialogue is open**, so each opening reads the list afresh — a snapshot
 * kept a minute ago is in it — and starts with nothing chosen, with no state to reset by hand.
 */

/** What the dialogue needs. */
export interface SnapshotDialogProps {
  /** Whether it is open — the top bar's button opens it. */
  picker: SnapshotPicker
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
}

/** The list as it stands: being read, read, or not readable. */
type Listing =
  | { state: 'reading' }
  | { state: 'read'; entries: SnapshotEntry[] }
  | { state: 'failed'; reason: string }

/** What the dialogue warns, every time it opens. */
const WARNING =
  'Opening a snapshot replaces the page you are working on. Your page is kept first as a snapshot: you will find it in this list.'

/**
 * One snapshot to choose, worded by its time.
 * @param props - the entry, whether it is chosen, how to choose it, the clock
 * @param props.entry - the snapshot
 * @param props.chosen - whether it is the one chosen
 * @param props.choose - choose a snapshot by name
 * @param props.now - the clock
 * @returns the row
 */
function SnapshotRow({
  entry,
  chosen,
  choose,
  now,
}: {
  entry: SnapshotEntry
  chosen: boolean
  choose: (name: string) => void
  now: () => Date
}) {
  // Handlers
  const pick = (): void => {
    choose(entry.name)
  }

  // Render
  return (
    <label className="snapshot-list__row">
      <input type="radio" name="snapshot" value={entry.name} checked={chosen} onChange={pick} />
      {timeWords(entry.takenAt, now(), { seconds: true })}
    </label>
  )
}

/**
 * The list, or why there is none.
 * @param props - the listing, the chosen name, how to choose, the year and the clock
 * @param props.listing - the list as it stands
 * @param props.chosen - the name chosen, or `null`
 * @param props.choose - choose a name
 * @param props.year - the year
 * @param props.now - the clock
 * @returns the list's content
 */
function SnapshotList({
  listing,
  chosen,
  choose,
  year,
  now,
}: {
  listing: Listing
  chosen: string | null
  choose: (name: string) => void
  year: number
  now: () => Date
}) {
  // Render
  if (listing.state === 'reading')
    return (
      <p className="snapshot-list__note" role="status">
        Reading the snapshots…
      </p>
    )
  if (listing.state === 'failed')
    return (
      <p className="snapshot-list__note" role="alert">
        The snapshots could not be listed ({listing.reason}).
      </p>
    )
  if (listing.entries.length === 0)
    return (
      <p className="snapshot-list__note" role="status">
        No snapshot of {String(year)} yet — one is kept every hour of drawing.
      </p>
    )
  return (
    <fieldset className="snapshot-list">
      <legend className="visually-hidden">Snapshots of {String(year)}, newest first</legend>
      {listing.entries.map((entry) => (
        <SnapshotRow
          key={entry.name}
          entry={entry}
          chosen={chosen === entry.name}
          choose={choose}
          now={now}
        />
      ))}
    </fieldset>
  )
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
function SnapshotChooser({
  source,
  year,
  now,
  onOpen,
  close,
}: Omit<SnapshotDialogProps, 'picker'> & { close: () => void }) {
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

/**
 * Render the dialogue, open while the picker is.
 * @param props - the picker, the source, the year, the clock, what opening does
 * @returns the dialogue
 */
export function SnapshotDialog({ picker, ...chooser }: SnapshotDialogProps) {
  // State
  const open = useSyncExternalStore(picker.subscribe, picker.isOpen)

  // Render
  return (
    <Modal isOpen={open} onClose={picker.close} aria-label="Open snapshot">
      <div className="draft-recovery">
        {open ? <SnapshotChooser {...chooser} close={picker.close} /> : null}
      </div>
    </Modal>
  )
}
