import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { sql } from '@payloadcms/db-sqlite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { down } from '../migrations/20261115_182214_holder_title'

import type { MigrateDownArgs } from '@payloadcms/db-sqlite'
import type { Payload } from 'payload'

/**
 * The hand-written way down of `holder_title` (CMS-422 step 2c) on a real base, its foreign keys active as in the
 * dev's: the generator's own rebuilt `place_periods` through a DROP TABLE, which cascades to every source line of every
 * sheet (`known-issues/cms.md`). Never the dev's base: Payload on a temporary SQLite file.
 */

const folder = mkdtempSync(path.join(tmpdir(), 'cms-holder-title-'))
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
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-holder-title-suite'
  const { getPayload, readMigrationFiles } = await import('payload')
  const { default: config } = await import('../payload.config')
  const { migrateBase } = await import('./migrateBase')
  payload = await getPayload({ config })
  await migrateBase(payload, databaseUrl, new Date(), await readMigrationFiles({ payload }))
  const source = await payload.create({
    collection: 'sources',
    data: { title: 'Chédeville et Tonnerre 1987', kind: 'scholarly' },
  })
  const place = await payload.create({
    collection: 'places',
    data: { name: 'Nantes', location: [-1.55, 47.22] },
  })
  await payload.create({
    collection: 'place-periods',
    data: {
      place: place.id,
      date: { start: { year: 1100 } },
      importance: 'city',
      testimonies: [{ source: source.id, subject: 'importance', importance: 'city' }],
    },
  })
}, 60_000)

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

describe('holder_title, down', () => {
  describe('happy path', () => {
    it('drops the column and keeps every sheet and every source line, foreign keys active', async () => {
      expect(await count(sql`PRAGMA foreign_keys`)).toBe(1)
      // Inside a transaction, as Payload runs a migration: there `PRAGMA foreign_keys=OFF` does nothing, which is why
      // the generator's rebuild cascades in the dev's base and would not here outside one
      await payload.db.drizzle.transaction(async (tx) => {
        await down({ db: tx } as unknown as MigrateDownArgs)
      })
      expect([
        await count(sql`SELECT count(*) FROM place_periods`),
        await count(sql`SELECT count(*) FROM place_periods_testimonies`),
        await count(
          sql`SELECT count(*) FROM pragma_table_info('place_periods') WHERE name = 'holder_title_id'`
        ),
      ]).toEqual([1, 1, 0])
    })
  })

  // L2–L5: N/A — one statement pair on one schema; its only failure, a rebuild that cascades, is the case above.
})
