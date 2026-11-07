import { useState } from 'react'

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
 * The filter of `{Polities}`' list (CARTO-360): the text is the list's own state — one writer, one reader, no slice —
 * and the rows are cut down to it at each render, so a polity added or renamed is filtered at once.
 * @param rows - the tree's rows, in its order
 * @param targetId - the polity the tools act on, or `null`
 * @returns the text, its setter, the rows that answer it and the target the keys may act on
 */
export function useRowFilter(rows: readonly PolityRow[], targetId: string | null): RowFilter {
  // State
  const [query, setQuery] = useState('')

  // Derived
  const filtered = filterRows(rows, query)
  const keysTarget = filtered.rows.some(({ id }) => id === targetId) ? targetId : null

  // Return
  return { query, setQuery, filtered, keysTarget }
}
