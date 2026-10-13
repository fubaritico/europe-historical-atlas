import { overrideRows } from './overrideRows'

import type { OverrideRow } from './overrideRows'
import type { CartographerStoreHook } from '../state/store'

/**
 * `{Overrides}` — every stretch and pair the author dressed, and `[Clear]` on each (`s13`: *see everything
 * I have overridden*, *clear one override*). Clearing is one undoable step; nothing is ever cleared by
 * itself — `s13`'s second guarantee.
 */

/** What the list shows and reports. */
export interface OverridesListProps {
  /** The rows, from {@link overrideRows}. */
  rows: readonly OverrideRow[]
  /** `[Clear]` was pressed on a row. */
  onClear: (row: OverrideRow) => void
}

/**
 * One override.
 * @param props - the row and the callback
 * @param props.row - the override
 * @param props.onClear - `[Clear]` was pressed
 * @returns the row
 */
function OverrideItem({ row, onClear }: { row: OverrideRow; onClear: (row: OverrideRow) => void }) {
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
    return <p className="line-panel__hint">Nothing overridden: every line follows its rule.</p>
  return (
    <ul className="override-list" aria-label="Overrides">
      {rows.map((row) => (
        <OverrideItem key={`${row.kind}:${String(row.index)}`} row={row} onClear={onClear} />
      ))}
    </ul>
  )
}

/**
 * `{Overrides}`, bound to the store.
 * @param props - the store
 * @param props.store - the store
 * @returns the panel
 */
export function OverridesPanel({ store }: { store: CartographerStoreHook }) {
  // Store
  store((state) => state.version)

  // Store actions
  const clearOverride = store((state) => state.clearOverride)

  // Derived
  const rows = overrideRows(store.getState().document)

  // Handlers
  const handleClear = (row: OverrideRow) => {
    clearOverride(row.kind, row.index, { kind: 'clear-override', label: `clear ${row.label}` })
  }

  // Render
  return (
    <section className="line-panel" aria-label="Overrides">
      <header className="polities__head">
        <h2 className="polities__title">Overrides</h2>
      </header>
      <OverridesList rows={rows} onClear={handleClear} />
    </section>
  )
}
