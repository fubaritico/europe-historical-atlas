import { matchesFilter } from '../../../utils/matchesFilter'

import type { PolityRow } from '../../../utils/polityRows'

/** The tree of `{Polities}` cut down to what answers a filter. */
export interface FilteredRows {
  /** The rows kept, in the tree's order: those that answer, and the suzerains above them. */
  rows: PolityRow[]
  /** The ids of the rows kept only to hold the tree — a suzerain whose own name does not answer: shown greyed. */
  dimmed: ReadonlySet<string>
  /** How many rows answer the filter themselves — the subhead's count. */
  found: number
}

/**
 * The rows that answer a filter (CARTO-360), **each with the chain of its suzerains above it**, so a vassal found
 * is still read in its tree: « Champagne » shows the Kingdom of France, greyed, then the Champagne. The order is the
 * tree's, unchanged. An empty filter keeps every row and greys none.
 *
 * Pure, on the rows `polityRows` built: their depth is what says who stands above whom — a row's suzerain is the
 * nearest row before it one level up.
 * @param rows - the tree's rows, in its order
 * @param query - what was typed in the filter
 * @returns the rows kept, those greyed, and how many answer
 */
export function filterRows(rows: readonly PolityRow[], query: string): FilteredRows {
  // The row standing at each depth above the one being read — its chain of suzerains.
  const chain: PolityRow[] = []
  const kept = new Set<string>()
  const answering = new Set<string>()
  for (const row of rows) {
    chain.length = Math.min(chain.length, row.depth)
    if (matchesFilter(row.name, query)) {
      answering.add(row.id)
      kept.add(row.id)
      for (const above of chain) kept.add(above.id)
    }
    chain.push(row)
  }
  const shown = rows.filter(({ id }) => kept.has(id))
  return {
    rows: shown,
    dimmed: new Set(shown.filter(({ id }) => !answering.has(id)).map(({ id }) => id)),
    found: answering.size,
  }
}
