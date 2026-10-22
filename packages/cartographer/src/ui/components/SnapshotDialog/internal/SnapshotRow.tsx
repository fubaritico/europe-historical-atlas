import { persistenceWords } from '../../../../persistence/persistenceWords'
import { timeWords } from '../../../../persistence/timeWords'
import { useLocale } from '../../../hooks/useLocale'

import type { SnapshotEntry } from '../../../../persistence/draft/draftStore'

/**
 * One snapshot to choose, worded by its time.
 * @param props - the entry, whether it is chosen, how to choose it, the clock
 * @param props.entry - the snapshot
 * @param props.chosen - whether it is the one chosen
 * @param props.choose - choose a snapshot by name
 * @param props.now - the clock
 * @returns the row
 */
export function SnapshotRow({
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
  // Context
  const locale = useLocale()

  // Derived
  const words = persistenceWords(locale)

  // Handlers
  const pick = (): void => {
    choose(entry.name)
  }

  // Render
  return (
    <label className="snapshot-list__row">
      <input type="radio" name="snapshot" value={entry.name} checked={chosen} onChange={pick} />
      {timeWords(entry.takenAt, now(), words, { seconds: true })}
    </label>
  )
}
