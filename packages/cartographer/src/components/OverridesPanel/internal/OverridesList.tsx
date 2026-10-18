import { OverrideItem } from './OverrideItem'

import type { OverrideRow } from '../overrideRows'

/** What the list shows and reports. */
export interface OverridesListProps {
  /** The rows, from `overrideRows`. */
  rows: readonly OverrideRow[]
  /** `[Clear]` was pressed on a row. */
  onClear: (row: OverrideRow) => void
}

/**
 * The list, or a sentence when there is nothing to list.
 * @param props - the rows and the callback
 * @param props.rows - the overrides
 * @param props.onClear - `[Clear]` was pressed on one
 * @returns the list
 */
export function OverridesList({ rows, onClear }: OverridesListProps) {
  // Render
  if (rows.length === 0)
    return <p className="panel__hint">Nothing overridden: every line follows its rule.</p>
  return (
    <ul className="override-list" aria-label="Overrides">
      {rows.map((row) => (
        <OverrideItem key={`${row.kind}:${String(row.index)}`} row={row} onClear={onClear} />
      ))}
    </ul>
  )
}
