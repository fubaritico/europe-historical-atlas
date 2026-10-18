import type { OverrideRow } from '../overrideRows'

/**
 * One override.
 * @param props - the row and the callback
 * @param props.row - the override
 * @param props.onClear - `[Clear]` was pressed
 * @returns the row
 */
export function OverrideItem({
  row,
  onClear,
}: {
  row: OverrideRow
  onClear: (row: OverrideRow) => void
}) {
  // Handlers
  const handleClear = () => {
    onClear(row)
  }

  // Render
  return (
    <li className="override-row" data-orphaned={row.orphaned}>
      <span className="override-row__hand">{row.hand ?? 'fact'}</span>
      <span className="override-row__what">{row.label}</span>
      <button
        type="button"
        className="override-row__clear"
        aria-label={`Clear ${row.hand ?? 'override'} · ${row.label}`}
        onClick={handleClear}
      >
        Clear
      </button>
    </li>
  )
}
