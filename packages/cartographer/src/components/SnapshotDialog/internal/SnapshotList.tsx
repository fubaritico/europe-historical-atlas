import { SnapshotRow } from './SnapshotRow'

import type { Listing } from '../listing'

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
export function SnapshotList({
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
