import { matchesFilter } from './matchesFilter'

/** A row of a tree of polities: its id, its name, and how deep it stands — what the filter needs of it. */
export interface TreeRow {
  /** Its id. */
  readonly id: string
  /** Its name, matched by the filter. */
  readonly name: string
  /** How deep in the tree of groups: 0 at the top, 1 for a vassal… */
  readonly depth: number
}

/** A tree of polities cut down to what answers a filter — `{Polities}`' rows, or `{Cities}`' advanced filters' boxes. */
export interface FilteredRows<Row extends TreeRow = TreeRow> {
  /** The rows kept, in the tree's order: those that answer, and the suzerains above them. */
  rows: Row[]
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
 * Pure, on rows in the tree's order (`polityRows`, or `{Cities}`' boxes built from them, CARTO-370): their depth is what
 * says who stands above whom — a row's suzerain is the nearest row before it one level up.
 * @param rows - the tree's rows, in its order
 * @param query - what was typed in the filter
 * @returns the rows kept, those greyed, and how many answer
 */
export function filterRows<Row extends TreeRow>(
  rows: readonly Row[],
  query: string
): FilteredRows<Row> {
  // The row standing at each depth above the one being read — its chain of suzerains.
  const chain: Row[] = []
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
