import { mkdirSync } from 'node:fs'
import path from 'node:path'

import { sql } from '@payloadcms/db-sqlite'

import { backupPath, decideBaseline, fileStamp } from './baseline'
import { dangerSentence } from './migrationDangers'

import type { MigrationRow } from './baseline'
import type { MigrationDanger } from './migrationDangers'
import type { Payload, readMigrationFiles } from 'payload'

/** A migration as Payload reads it from disk: its name, its `up` and `down`. */
export type Migration = Awaited<ReturnType<typeof readMigrationFiles>>[number]

/** What `migrateBase` did to the base, said by the script that runs it. */
export interface MigrateReport {
  /** The copy taken before anything changed, or `null` when nothing was to change. */
  readonly backup: string | null
  /** The migrations recorded as applied without running, when a pushed base was adopted. */
  readonly adopted: readonly string[]
  /** The migrations applied by this run. */
  readonly applied: readonly string[]
}

/** The adapter's parts this module uses — Drizzle, the collections' schema, and drizzle-kit's push in dry run. */
interface SqliteParts {
  readonly drizzle: {
    all: (query: ReturnType<typeof sql>) => Promise<unknown[]>
    run: (query: ReturnType<typeof sql>) => Promise<unknown>
    transaction: <T>(
      work: (tx: { run: (query: ReturnType<typeof sql>) => Promise<unknown> }) => Promise<T>
    ) => Promise<T>
  }
  readonly schema: unknown
  readonly requireDrizzleKit: () => {
    pushSchema: (schema: unknown, drizzle: unknown) => Promise<{ statementsToExecute: string[] }>
  }
}

/**
 * Read the base's migration rows.
 * @param db - the adapter
 * @returns the rows, or `null` when the base has no migration table (a new base)
 */
async function readRows(db: SqliteParts): Promise<MigrationRow[] | null> {
  const tables = await db.drizzle.all(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'payload_migrations'`
  )
  if (tables.length === 0) return null
  const rows = (await db.drizzle.all(sql`SELECT name, batch FROM payload_migrations`)) as {
    name: string
    batch: number | string
  }[]
  return rows.map((row) => ({ name: row.name, batch: Number(row.batch) }))
}

/**
 * Bring a base to the collections' schema by its migrations, never by the push (CMS-276): adopt a base the push
 * built when it is exactly the collections' schema, copy the base before any change, then apply what is pending.
 *
 * A pushed base that differs from the collections is **refused** — an error naming what differs, nothing written:
 * the dev's server does not start on a base whose schema nobody can vouch for. So is a base under migrations that
 * the push ran on again: Payload's `migrate` would ask about it in the terminal, and a « no » exits with success.
 *
 * **A pending migration that can lose data, unread, is refused** (CMS-280): a table or a column dropped, a rename, a
 * rebuild — named, nothing copied, nothing written, until the migration says `// dangers reviewed: <why>`. Either way:
 * a way down is what undoes a mistake, and the trap of 2026-11-15 was in one (review SEC-005).
 * Only on a base that holds something: a new base is built from nothing, and has nothing to lose.
 * @param payload - Payload, initialised on the base (its config sets `push: false`)
 * @param databaseUrl - the base's `DATABASE_URL`, where the copy goes beside it
 * @param now - the moment, for the copy's name
 * @param migrations - the migrations, oldest first — `readMigrationFiles({ payload })`, given by the caller
 * @param dangersOf - the unread dangers of a migration, by its name (`dangersOnDisk`)
 * @returns what was done
 */
export async function migrateBase(
  payload: Payload,
  databaseUrl: string,
  now: Date,
  migrations: readonly Migration[],
  dangersOf: (name: string) => readonly MigrationDanger[]
): Promise<MigrateReport> {
  const db = payload.db as unknown as SqliteParts
  const names = migrations.map((migration) => migration.name)
  const rows = await readRows(db)
  if (rows === null) {
    // A new base: its migrations build it, and there is nothing to copy.
    await payload.db.migrate({ migrations: [...migrations] })
    return { backup: null, adopted: [], applied: names }
  }
  const action = decideBaseline(rows, names, await pushDifferences(db, rows))
  if (action.kind === 'refuse' || action.kind === 'pushedSince') throw new Error(refusal(action))
  const recorded = rows.filter((row) => row.batch > 0).map((row) => row.name)
  const pending = action.kind === 'baseline' ? [] : names.filter((name) => !recorded.includes(name))
  if (action.kind === 'none' && pending.length === 0) {
    return { backup: null, adopted: [], applied: [] }
  }
  const unread = pending.flatMap((name) =>
    dangersOf(name).map((danger) => `${name}: ${dangerSentence(danger)}`)
  )
  if (unread.length > 0) {
    throw new Error(
      `[CMS] a pending migration can lose what the base holds, either way, and nobody said it was read — nothing was written:\n` +
        `${unread.join('\n')}\n` +
        'Read it; rewrite it by hand if the data must survive (packages/cms/README.md), then add the line ' +
        '« // dangers reviewed: <why> » to it.'
    )
  }
  const backup = await copyBase(db, databaseUrl, now, recorded)
  if (action.kind === 'baseline') await adopt(db, action.markApplied)
  await payload.db.migrate({ migrations: [...migrations] })
  return {
    backup,
    adopted: action.kind === 'baseline' ? action.markApplied : [],
    applied: pending,
  }
}

/**
 * The sentence a refused base is told by — said in the terminal of `pnpm dev:cms`, where the server stops.
 * @param action - the refusal
 * @returns the message, its differences listed
 */
function refusal(
  action: { kind: 'refuse'; differences: readonly string[] } | { kind: 'pushedSince' }
): string {
  if (action.kind === 'pushedSince') {
    return (
      '[CMS] the schema push ran on this base after its migrations (a « dev » row in payload_migrations), so what ' +
      'it holds is in no migration — nothing was written. Compare it with the collections on a copy before going on.'
    )
  }
  return (
    `[CMS] the base was built by the schema push and differs from the collections, so it cannot be put under ` +
    `migrations — nothing was written. What differs:\n${action.differences.join('\n')}`
  )
}

/**
 * Refuse a base its migrations have not all reached — for the scripts that read it without changing it (the export):
 * a base behind the collections would fail on a missing column, mid-way, with an SQL error.
 * @param payload - Payload, initialised on the base
 * @param migrations - the migrations on disk
 * @throws when one is not recorded as applied, naming them and the way out
 */
export async function assertMigrated(
  payload: Payload,
  migrations: readonly Migration[]
): Promise<void> {
  // No migration table is a base none has reached: every migration is then missing, and said so
  const rows = (await readRows(payload.db as unknown as SqliteParts)) ?? []
  const recorded = new Set(rows.filter((row) => row.batch > 0).map((row) => row.name))
  const missing = migrations
    .map((migration) => migration.name)
    .filter((name) => !recorded.has(name))
  if (missing.length > 0) {
    throw new Error(
      `[CMS] the base is behind the collections — migrations not applied: ${missing.join(', ')}. ` +
        'Restart the CMS (`pnpm dev:cms` applies them), then run this again.'
    )
  }
}

/**
 * What a push would still change in a base the push built — the only kind whose schema is in doubt.
 *
 * Known limit (review QUAL-006, 15/11, verified in drizzle-kit 0.31.7's `pushSQLiteSchema`): the dry run goes through
 * Drizzle's interactive resolvers, so a pushed base differing by a table or a column that could be a rename gets
 * Drizzle's question in the terminal instead of the refusal. It runs once per base, at its adoption; the dev's base was
 * measured identical (15/11), so it does not reach it.
 * @param db - the adapter
 * @param rows - the base's migration rows
 * @returns Drizzle's statements; none for a base already under migrations, which is not compared
 */
async function pushDifferences(db: SqliteParts, rows: readonly MigrationRow[]): Promise<string[]> {
  if (rows.some((row) => row.batch > 0)) return []
  return (await db.requireDrizzleKit().pushSchema(db.schema, db.drizzle)).statementsToExecute
}

/**
 * Copy the base before its schema changes, by SQLite's `VACUUM INTO` — a consistent copy even while it is written.
 * @param db - the adapter
 * @param databaseUrl - the base's `DATABASE_URL`
 * @param now - the moment, for the copy's name
 * @param recorded - the migrations the base holds, for the copy's name
 * @returns the copy's path
 */
async function copyBase(
  db: SqliteParts,
  databaseUrl: string,
  now: Date,
  recorded: readonly string[]
): Promise<string> {
  // A base with no migration recorded yet (a pushed one) is named « none », not a missing value
  const lastApplied = [...recorded].sort().at(-1) ?? 'none'
  const backup = backupPath(databaseUrl, fileStamp(now), lastApplied)
  mkdirSync(path.dirname(backup), { recursive: true })
  await db.drizzle.run(sql`VACUUM INTO ${backup}`)
  return backup
}

/**
 * Put a pushed base under migrations, in one transaction: the push's marker removed, every migration recorded as
 * applied — the base already holds their schema.
 * @param db - the adapter
 * @param names - the migrations to record
 */
async function adopt(db: SqliteParts, names: readonly string[]): Promise<void> {
  await db.drizzle.transaction(async (tx) => {
    await tx.run(sql`DELETE FROM payload_migrations WHERE batch = -1`)
    for (const name of names) {
      await tx.run(sql`INSERT INTO payload_migrations (name, batch) VALUES (${name}, 1)`)
    }
  })
}
