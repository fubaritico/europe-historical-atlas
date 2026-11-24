import { mapRelations } from '../fields/mapRelations'

import type { Field } from 'payload'

/**
 * A record's citations of one record moved to another (CMS-509, the merge of two duplicates), on the one walk over a
 * record's relations (`fields/mapRelations`). Pure — data in, data out — so the merge saves only the fields it changed,
 * and a test reads it with literals.
 */

/** Which record of which collection is moved, and where. */
export interface Repointing {
  /** The collection of the two records. */
  readonly target: string
  /** The record merged away. */
  readonly from: number | string
  /** The record kept. */
  readonly to: number | string
}

/**
 * One value of a relationship, moved when it is the record merged away — an id, or a populated record.
 * @param value - the value
 * @param move - what is moved
 * @returns the value, moved or as it was
 */
function moved(value: unknown, move: Repointing): unknown {
  const id = value !== null && typeof value === 'object' ? (value as { id?: unknown }).id : value
  return (typeof id === 'number' || typeof id === 'string') && String(id) === String(move.from)
    ? move.to
    : value
}

/**
 * The fields of a record that cite the record merged away, each with its value moved to the record kept — what an
 * update has to save, and nothing else.
 * @param fields - the record's collection's fields
 * @param record - the record, read at depth 0
 * @param move - what is moved
 * @returns the top-level fields changed, by name; empty when the record cites nothing moved
 */
export function repointed(
  fields: readonly Field[],
  record: Record<string, unknown>,
  move: Repointing
): Record<string, unknown> {
  const out = mapRelations(fields, record, (value, relationTo) =>
    relationTo === move.target ? moved(value, move) : value
  ) as Record<string, unknown>
  return Object.fromEntries(Object.entries(out).filter(([name, value]) => value !== record[name]))
}
