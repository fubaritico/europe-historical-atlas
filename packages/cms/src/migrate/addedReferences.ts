/** A foreign key as Drizzle's snapshot of a migration declares it. */
interface SnapshotForeignKey {
  /** The table that holds the column. */
  readonly tableFrom: string
  /** The column, alone. */
  readonly columnsFrom: readonly string[]
  /** What deleting the row it points at does: `cascade`, `set null`… */
  readonly onDelete?: string
  /** What updating it does. */
  readonly onUpdate?: string
}

/** The part of a migration's snapshot this module reads: each table's foreign keys. */
export interface MigrationSnapshot {
  /** The tables, by name. */
  readonly tables: Readonly<
    Record<string, { readonly foreignKeys?: Readonly<Record<string, SnapshotForeignKey>> }>
  >
}

/** A column added with Drizzle's short reference — the actions the collection declares left out. */
const SHORT_REFERENCE = /ALTER TABLE \\`(\w+)\\` ADD \\`(\w+)\\` integer REFERENCES (\w+)\(id\);/g

/**
 * Write each column a migration adds with a foreign key **with the actions its snapshot declares**. Drizzle's
 * generator writes `ADD … REFERENCES t(id)` and leaves out `ON DELETE` (drizzle-kit 0.31.7): the base then holds a key
 * the collections do not describe, `migrateBase.test.ts` sees the difference, and Drizzle's own fix is to rebuild the
 * table — a DROP TABLE that, with SQLite's foreign keys on and inside Payload's transaction, cascades to every row
 * pointing at it (measured, 2026-11-15). SQLite accepts the whole clause on an added column, so it is written whole.
 * @param source - the migration's text, as the generator wrote it
 * @param snapshot - the snapshot written beside it — the collections' schema after it
 * @returns the text, each short reference completed; a column the snapshot has no key for is left as it is
 */
export function addedReferences(source: string, snapshot: MigrationSnapshot): string {
  return source.replace(
    SHORT_REFERENCE,
    (whole: string, table: string, column: string, target: string) => {
      const key = Object.values(snapshot.tables[table]?.foreignKeys ?? {}).find(
        (candidate) => candidate.columnsFrom.length === 1 && candidate.columnsFrom[0] === column
      )
      if (key === undefined) return whole
      // An action the snapshot leaves out is SQLite's own default, NO ACTION — written out, the same key
      const actions = ` ON UPDATE ${key.onUpdate ?? 'no action'} ON DELETE ${key.onDelete ?? 'no action'}`
      return `ALTER TABLE \\\`${table}\\\` ADD \\\`${column}\\\` integer REFERENCES \\\`${target}\\\`(\\\`id\\\`)${actions};`
    }
  )
}

/** Any added column whose reference ends right after `(id)` — no action written — whatever its spelling. */
const ANY_SHORT_REFERENCE = /ADD \\?`?(\w+)\\?`?[^;`]*REFERENCES[^;]*\(\\?`?id\\?`?\)\s*;/g

/**
 * The columns a migration still adds with a foreign key and no action — what `addedReferences` could not complete: a
 * column its snapshot has no key for, or a spelling the generator has started to write differently. Said by
 * `pnpm migrate:create`, so a fix that did not apply is never silent.
 * @param source - the migration's text, finished
 * @returns the columns, by name
 */
export function shortReferencesLeft(source: string): string[] {
  return [...source.matchAll(ANY_SHORT_REFERENCE)].map((match) => match[1] ?? '')
}
