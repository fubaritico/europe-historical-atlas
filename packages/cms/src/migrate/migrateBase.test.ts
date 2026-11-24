import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { sql } from '@payloadcms/db-sqlite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type * as MigrateModule from './migrateBase'
import type { Migration } from './migrateBase'
import type { MigrationDanger } from './migrationDangers'
import type { Payload } from 'payload'

/**
 * The migrations against a real base — Payload booted on a temporary SQLite file, never the dev's (CMS-276). The
 * first test is the guard of the schema: every migration applied from an empty base must give exactly the
 * collections' schema, so a field changed without its migration fails here.
 */

/** The parts of the adapter the checks use. */
interface Parts {
  readonly drizzle: {
    all: (query: ReturnType<typeof sql>) => Promise<unknown[]>
    run: (query: ReturnType<typeof sql>) => Promise<unknown>
  }
  readonly schema: unknown
  readonly requireDrizzleKit: () => {
    pushSchema: (schema: unknown, drizzle: unknown) => Promise<{ statementsToExecute: string[] }>
  }
}

/** A migration after the ones on disk, changing nothing — so the schema guard stays true while it is pending. */
const LATER: Migration = {
  name: '29991231_000000_later',
  up: async (args: unknown) => {
    const { db } = args as { db: Parts['drizzle'] }
    await db.run(sql`SELECT 1`)
  },
  down: () => Promise.resolve(),
}

/** A migration the suite never applies: the one an unread danger refuses. */
const UNREAD: Migration = {
  name: '29991231_000001_unread',
  up: () => Promise.resolve(),
  down: () => Promise.resolve(),
}

/**
 * The unread dangers of {@link UNREAD} — a table dropped on the way up, a rebuild on the way down — and of no other.
 * @param name - a migration's name
 * @returns its dangers
 */
function unreadDangersOf(name: string): MigrationDanger[] {
  return name === UNREAD.name
    ? [
        { direction: 'up', kind: 'drop-table', table: 'places_locales' },
        { direction: 'down', kind: 'rebuild', table: 'place_periods' },
      ]
    : []
}

const folder = mkdtempSync(path.join(tmpdir(), 'cms-migrations-'))
const databaseUrl = `file:${path.join(folder, 'cms.db')}`
let payload: Payload
let module: typeof MigrateModule
let onDisk: Migration[]

/**
 * What a schema push would still change in the base.
 * @returns Drizzle's statements, empty when the base is the collections' schema
 */
async function differences(): Promise<string[]> {
  const db = payload.db as unknown as Parts
  return (await db.requireDrizzleKit().pushSchema(db.schema, db.drizzle)).statementsToExecute
}

/**
 * The base's migration rows.
 * @returns name and batch of each, by name
 */
async function rows(): Promise<{ name: string; batch: number }[]> {
  const db = payload.db as unknown as Parts
  const found = (await db.drizzle.all(
    sql`SELECT name, batch FROM payload_migrations ORDER BY name`
  )) as { name: string; batch: number | string }[]
  return found.map((row) => ({ name: row.name, batch: Number(row.batch) }))
}

/**
 * The copies taken so far.
 * @returns their file names
 */
function copies(): string[] {
  const where = path.join(folder, '.backups')
  return existsSync(where) ? readdirSync(where) : []
}

/**
 * Turn the base back into what the dev-mode push leaves: no migration recorded, the push's marker.
 */
async function asPushed(): Promise<void> {
  const db = payload.db as unknown as Parts
  await db.drizzle.run(sql`DELETE FROM payload_migrations`)
  await db.drizzle.run(sql`INSERT INTO payload_migrations (name, batch) VALUES ('dev', -1)`)
}

/**
 * Run `migrateBase` at a given minute of the suite's day.
 * @param minute - the minute, so each copy has its own name
 * @param migrations - the migrations to give it
 * @param dangersOf - the unread dangers of a migration; none unless a test says
 * @returns its report
 */
function migrateAt(
  minute: number,
  migrations: readonly Migration[],
  dangersOf: (name: string) => readonly MigrationDanger[] = () => []
): ReturnType<typeof MigrateModule.migrateBase> {
  const now = new Date(Date.UTC(2026, 10, 15, 15, minute))
  return module.migrateBase(payload, databaseUrl, now, migrations, dangersOf)
}

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-migrations-suite'
  const { getPayload, readMigrationFiles } = await import('payload')
  const { default: config } = await import('../payload.config')
  module = await import('./migrateBase')
  payload = await getPayload({ config })
  onDisk = await readMigrationFiles({ payload })
}, 60_000)

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

describe('migrateBase', () => {
  describe('happy path', () => {
    it('builds a new base by its migrations alone, to exactly the collections’ schema', async () => {
      const report = await migrateAt(0, onDisk)
      expect(report).toEqual({ backup: null, adopted: [], applied: onDisk.map((m) => m.name) })
      expect(await differences()).toEqual([])
    }, 60_000)
  })

  describe('variants', () => {
    it('does nothing on a base already up to date — no copy, nothing applied', async () => {
      expect(await migrateAt(1, onDisk)).toEqual({ backup: null, adopted: [], applied: [] })
      expect(copies()).toEqual([])
    }, 60_000)

    it('applies a migration pending on a base under migrations, the copy named after the last one held', async () => {
      const last = onDisk
        .map((m) => m.name)
        .sort()
        .at(-1)
      const report = await migrateAt(2, [...onDisk, LATER])
      expect(report).toEqual({
        backup: path.join(folder, '.backups', `cms-20261115-150200-${String(last)}.db`),
        adopted: [],
        applied: [LATER.name],
      })
      expect(await rows()).toContainEqual({ name: LATER.name, batch: 2 })
      expect(existsSync(report.backup ?? '')).toBe(true)
    }, 60_000)

    it('adopts a base the push built: copied first, every migration recorded, the push marker gone', async () => {
      await asPushed()
      const all = [...onDisk, LATER]
      const report = await migrateAt(3, all)
      expect(report.adopted).toEqual(all.map((m) => m.name))
      expect(report.backup).toBe(path.join(folder, '.backups', 'cms-20261115-150300-none.db'))
      expect(await rows()).toEqual(
        all.map((m) => ({ name: m.name, batch: 1 })).sort((a, b) => a.name.localeCompare(b.name))
      )
    }, 60_000)
  })

  describe('managed errors', () => {
    it('refuses a pending migration that can lose data either way, unread: named, no copy, nothing applied', async () => {
      const before = copies()
      const refusal = await migrateAt(3, [...onDisk, LATER, UNREAD], unreadDangersOf).catch(
        (error: unknown) => (error instanceof Error ? error.message : String(error))
      )
      expect(refusal).toContain(`${UNREAD.name}: up drops the table places_locales`)
      // Either way: the way down's rebuild is refused too (review SEC-005)
      expect(refusal).toContain(`${UNREAD.name}: down rebuilds`)
      expect(copies()).toEqual(before)
      expect(await rows()).not.toContainEqual(expect.objectContaining({ name: UNREAD.name }))
    }, 60_000)

    it('refuses a base under migrations that the push ran on again, and writes nothing', async () => {
      const db = payload.db as unknown as Parts
      await db.drizzle.run(sql`INSERT INTO payload_migrations (name, batch) VALUES ('dev', -1)`)
      try {
        const before = await rows()
        const copiesBefore = copies().length
        await expect(migrateAt(4, [...onDisk, LATER])).rejects.toThrow(
          'ran on this base after its migrations'
        )
        expect(await rows()).toEqual(before)
        expect(copies().length).toBe(copiesBefore)
      } finally {
        // The next tests start from a base under migrations, the marker gone, whatever happened here
        await db.drizzle.run(sql`DELETE FROM payload_migrations WHERE batch = -1`)
      }
    }, 60_000)

    it('refuses a pushed base that differs from the collections, and writes nothing', async () => {
      const db = payload.db as unknown as Parts
      await asPushed()
      await db.drizzle.run(sql`ALTER TABLE places ADD COLUMN extra text`)
      const copiesBefore = copies().length
      await expect(migrateAt(5, onDisk)).rejects.toThrow('differs from the collections')
      expect(await rows()).toEqual([{ name: 'dev', batch: -1 }])
      expect(copies().length).toBe(copiesBefore)
    }, 60_000)
  })

  // L4: N/A — the failures past these (a migration that throws) are Payload's own `migrate`, inside its transaction.
  // L5: the edge — an empty migration table rather than the push marker — is decideBaseline's (baseline.test.ts).
})

describe('assertMigrated', () => {
  it('lets through a base every migration has reached', async () => {
    await (payload.db as unknown as Parts).drizzle.run(sql`DELETE FROM payload_migrations`)
    for (const migration of onDisk) {
      await (payload.db as unknown as Parts).drizzle.run(
        sql`INSERT INTO payload_migrations (name, batch) VALUES (${migration.name}, 1)`
      )
    }
    await expect(module.assertMigrated(payload, onDisk)).resolves.toBeUndefined()
  })

  it('refuses a base behind the collections, naming the migrations missing and the way out', async () => {
    await expect(module.assertMigrated(payload, [...onDisk, LATER])).rejects.toThrow(
      `migrations not applied: ${LATER.name}. Restart the CMS`
    )
  })

  // Last of the file: it drops the migration table the tests above share
  it('refuses a base no migration ever reached, naming every one', async () => {
    await (payload.db as unknown as Parts).drizzle.run(sql`DROP TABLE payload_migrations`)
    await expect(module.assertMigrated(payload, onDisk)).rejects.toThrow(
      `migrations not applied: ${onDisk.map((m) => m.name).join(', ')}.`
    )
  })
})
