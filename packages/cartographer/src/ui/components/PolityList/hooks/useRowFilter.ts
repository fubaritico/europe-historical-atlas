import { filterRows } from '../../../utils/filterRows'

import type { FilteredRows } from '../../../utils/filterRows'
import type { PolityRow } from '../../../utils/polityRows'

/** What the list's filter holds: the text typed, its setter, the rows that answer it, the target the keys see. */
export interface RowFilter {
  /** What is typed in the filter. */
  query: string
  /** Change what is typed. */
  setQuery: (query: string) => void
  /** The rows that answer it, under their suzerains (`filterRows`). */
  filtered: FilteredRows<PolityRow>
  /**
   * The target as the keys see it — `null` when the filter hides its row, so ‹enter› or the menu key never act on a
   * polity the reader cannot see (review QUAL-001). The row stays the target: marked, and brought into view again.
   */
  keysTarget: string | null
}

/**
 * The filter of `{Polities}`' list (CARTO-360): the rows are cut down to what is typed at each render, so a polity
 * added or renamed is filtered at once. What is typed is the store's (CARTO-427), kept across a reload.
 * @param rows - the tree's rows, in its order
 * @param targetId - the polity the tools act on, or `null`
 * @param search - what is typed in the filter, and its setter — the store's
 * @returns the text, its setter, the rows that answer it and the target the keys may act on
 */
export function useRowFilter(
  rows: readonly PolityRow[],
  targetId: string | null,
  search: readonly [string, (query: string) => void]
): RowFilter {
  // Derived
  const [query, setQuery] = search
  const filtered = filterRows(rows, query)
  const keysTarget = filtered.rows.some(({ id }) => id === targetId) ? targetId : null

  // Return
  return { query, setQuery, filtered, keysTarget }
}
