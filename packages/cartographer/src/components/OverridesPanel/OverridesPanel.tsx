import { Panel } from '../Panel'

import { OverridesList } from './internal/OverridesList'
import { overrideRows } from './overrideRows'

import type { OverrideRow } from './overrideRows'
import type { CartographerStoreHook } from '../../state/store'

/**
 * `{Overrides}` — every stretch and pair the author dressed, and `[Clear]` on each (`s13`: *see everything
 * I have overridden*, *clear one override*). Clearing is one undoable step; nothing is ever cleared by
 * itself — `s13`'s second guarantee.
 */

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
    <Panel title="Overrides">
      <OverridesList rows={rows} onClear={handleClear} />
    </Panel>
  )
}
