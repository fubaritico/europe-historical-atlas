import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { sql } from '@payloadcms/db-sqlite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { down } from '../migrations/20261121_220424_period_names'
import { down as downBin } from '../migrations/20261124_155239_bin'
import { down as downHierarchy } from '../migrations/20261128_010000_hierarchy_links'

import type { MigrateDownArgs } from '@payloadcms/db-sqlite'
import type { Payload } from 'payload'

/**
 * The hand-written way down of `period_names` (CMS-495) on a real base, its foreign keys active as in the dev's: the
 * generator's own rebuilt `place_periods` through a DROP TABLE, which cascades to every source line of every sheet
 * (`known-issues/cms.md`). Never the dev's base: Payload on a temporary SQLite file.
 */

const folder = mkdtempSync(path.join(tmpdir(), 'cms-period-names-'))
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
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-period-names-suite'
  const { getPayload, readMigrationFiles } = await import('payload')
  const { default: config } = await import('../payload.config')
  const { migrateBase } = await import('./migrateBase')
  payload = await getPayload({ config })
  await migrateBase(
    payload,
    databaseUrl,
    new Date(),
    await readMigrationFiles({ payload }),
    () => []
  )
  const source = await payload.create({
    collection: 'sources',
    data: { title: 'Annales Magdeburgenses', kind: 'primary' },
  })
  const place = await payload.create({
    collection: 'places',
    data: {
      name: 'Ankara',
      otherNames: [{ language: 'en', form: 'Ankara' }],
      location: [32.85, 39.93],
    },
  })
  const name = await payload.create({
    collection: 'period-names',
    data: {
      place: place.id,
      forms: [
        { language: 'fr', form: 'Ancyre' },
        { language: 'en', form: 'Ancyra' },
      ],
      lines: [{ source: source.id }],
    },
  })
  await payload.create({
    collection: 'place-periods',
    data: {
      place: place.id,
      periodName: name.id,
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

describe('period_names, down', () => {
  describe('happy path', () => {
    it('drops the column and the three tables, and keeps every sheet and every source line, foreign keys active', async () => {
      expect(await count(sql`PRAGMA foreign_keys`)).toBe(1)
      // Inside a transaction, as Payload runs a migration: there `PRAGMA foreign_keys=OFF` does nothing, which is why
      // the generator's rebuild cascades in the dev's base and would not here outside one
      await payload.db.drizzle.transaction(async (tx) => {
        // The migrations after this one are undone first, newest first: the hierarchy links' rename (REPO-589), since
        // the bin's way down drops one of its indexes by its old name; then the bin (CMS-508), which already drops the
        // key's « delete » box of the period names this down drops too
        await downHierarchy({ db: tx } as unknown as MigrateDownArgs)
        await downBin({ db: tx } as unknown as MigrateDownArgs)
        await down({ db: tx } as unknown as MigrateDownArgs)
      })
      expect([
        await count(sql`SELECT count(*) FROM place_periods`),
        await count(sql`SELECT count(*) FROM place_periods_testimonies`),
        await count(
          sql`SELECT count(*) FROM pragma_table_info('place_periods') WHERE name = 'period_name_id'`
        ),
        await count(
          sql`SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name LIKE 'period_names%'`
        ),
      ]).toEqual([1, 1, 0, 0])
    })
  })

  // L2–L5: N/A — one list of statements on one schema; its only failure, a rebuild that cascades, is the case above.
})
