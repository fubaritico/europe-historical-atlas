import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { sql } from '@payloadcms/db-sqlite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { down, up } from '../migrations/20261115_215340_unique_wikidata'

import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'
import type { Payload } from 'payload'

/**
 * The unique Wikidata ids' migration on a base that already holds empty ids — rows saved before the field read `''`
 * as no id, which a unique index would count as one value and refuse. Never the dev's base: Payload on a temporary
 * SQLite file, the migration run inside a transaction, as Payload runs it.
 */

const folder = mkdtempSync(path.join(tmpdir(), 'cms-unique-wikidata-'))
const databaseUrl = `file:${path.join(folder, 'cms.db')}`
let payload: Payload

/**
 * One number the base answers.
 * @param query - a query answering one row of one column
 * @returns the number
 */
async function count(query: ReturnType<typeof sql>): Promise<number> {
  const rows = await payload.db.drizzle.all<Record<string, number>>(query)
  return Object.values(rows[0] ?? {})[0] ?? Number.NaN
}

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-unique-wikidata-suite'
  const { getPayload, readMigrationFiles } = await import('payload')
  const { default: config } = await import('../payload.config')
  const { migrateBase } = await import('./migrateBase')
  payload = await getPayload({ config })
  await migrateBase(payload, databaseUrl, new Date(), await readMigrationFiles({ payload }))
}, 60_000)

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

describe('unique_wikidata', () => {
  describe('edge cases', () => {
    it('reads the empty ids saved before it as no id, then lays its indexes', async () => {
      await payload.db.drizzle.transaction(async (tx) => {
        await down({ db: tx } as unknown as MigrateDownArgs)
      })
      await payload.db.drizzle.run(
        sql`INSERT INTO people (kind, wikidata) VALUES ('person', ''), ('person', '')`
      )
      await payload.db.drizzle.transaction(async (tx) => {
        await up({ db: tx } as unknown as MigrateUpArgs)
      })
      expect([
        await count(sql`SELECT count(*) FROM people WHERE wikidata = ''`),
        await count(sql`SELECT count(*) FROM sqlite_master WHERE name LIKE '%_wikidata_idx'`),
      ]).toEqual([0, 5])
    })
  })

  // L1–L4: N/A here — the indexes on a fresh base are migrateBase.test.ts's, the refusals of a duplicate claims.test.ts's.
})
