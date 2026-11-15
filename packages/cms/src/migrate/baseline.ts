import path from 'node:path'

/** A row of Payload's `payload_migrations` table: a migration applied, or `batch` -1 for the schema pushed in dev. */
export interface MigrationRow {
  /** The migration's file name, or `dev` for the push's own marker. */
  readonly name: string
  /** The run that applied it, from 1; -1 marks a base built by the dev-mode push. */
  readonly batch: number
}

/** What the base needs before Payload's own `migrate` may run on it (CMS-276). */
export type BaselineAction =
  /** Nothing before `migrate`: a base already under migrations. */
  | { readonly kind: 'none' }
  /** A base built by the push and identical to the collections: every migration is recorded as applied, the push's
   * marker removed — so `migrate` neither re-creates its tables nor asks its question about the push. */
  | { readonly kind: 'baseline'; readonly markApplied: readonly string[] }
  /** A base built by the push that differs from the collections: nothing is written, the differences are said. */
  | { readonly kind: 'refuse'; readonly differences: readonly string[] }
  /** A base under migrations that the push ran on again since (its marker beside applied migrations): nothing is
   * written — Payload's `migrate` would ask its question about the push, and a « no » exits with success. */
  | { readonly kind: 'pushedSince' }

/**
 * Decide how a base reaches migrations.
 *
 * A base the push built has the collections' tables and no record of any migration — `migrate` would re-run the
 * first one over tables that exist, and first ask, in the terminal, whether to go on « with data loss ». It can only
 * be adopted when it is **exactly** the collections' schema: then every migration on disk describes what it already
 * holds. Any difference is refused — adopting it would record as applied a schema it does not have. A base under
 * migrations that the push touched again is refused too: what the push changed is in no migration.
 * A new base, with no migration table, is not asked about: its migrations build it (`migrateBase`).
 * @param rows - the base's `payload_migrations` rows
 * @param migrations - the names of the migrations on disk, oldest first
 * @param differences - what a push would still change in the base (Drizzle's statements), empty when identical
 * @returns what to do before `migrate`
 */
export function decideBaseline(
  rows: readonly MigrationRow[],
  migrations: readonly string[],
  differences: readonly string[]
): BaselineAction {
  if (rows.some((row) => row.batch > 0)) {
    return rows.some((row) => row.batch === -1) ? { kind: 'pushedSince' } : { kind: 'none' }
  }
  if (differences.length > 0) return { kind: 'refuse', differences }
  return { kind: 'baseline', markApplied: migrations }
}

/**
 * The file a base is copied to before its schema changes: beside it, under `.backups/` (git-ignored, as every
 * `*.db`), named by the moment and the last migration it holds.
 * @param databaseUrl - the base's `DATABASE_URL`, a `file:` URL
 * @param stamp - the moment, as a file name allows it (`20261115-162700`)
 * @param lastApplied - the newest migration the base holds before the change, or `none`
 * @returns the copy's absolute path
 */
export function backupPath(databaseUrl: string, stamp: string, lastApplied: string): string {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error(
      `[CMS] the base is not a file, so it cannot be copied before a migration: ${databaseUrl}`
    )
  }
  const file = path.resolve(databaseUrl.slice('file:'.length))
  const name = `${path.basename(file, path.extname(file))}-${stamp}-${lastApplied}.db`
  return path.join(path.dirname(file), '.backups', name)
}

/**
 * A moment written for a file name: `YYYYMMDD-HHMMSS`, in UTC.
 * @param moment - the moment
 * @returns its stamp
 */
export function fileStamp(moment: Date): string {
  return moment.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')
}
