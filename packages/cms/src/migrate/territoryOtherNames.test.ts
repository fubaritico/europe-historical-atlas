import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { sql } from '@payloadcms/db-sqlite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { down, up } from '../migrations/20261122_004948_territory_other_names'

import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'
import type { Payload } from 'payload'

/**
 * The hand-written copy of `territory_other_names` (CMS-495) on a real base, its foreign keys active as in the dev's:
 * the English names typed through the admin's language switch become lines of the new table, the localized rows left
 * as they are. Never the dev's base: Payload on a temporary SQLite file, brought to the schema before this migration
 * by undoing it once, then filled, then migrated up and down by hand.
 */

const folder = mkdtempSync(path.join(tmpdir(), 'cms-territory-other-names-'))
const databaseUrl = `file:${path.join(folder, 'cms.db')}`
let payload: Payload
let ponthieu: number
let blank: number
let frenchOnly: number

/**
 * The rows a query answers.
 * @param query - the query
 * @returns its rows
 */
function rows(query: ReturnType<typeof sql>): Promise<Record<string, unknown>[]> {
  return payload.db.drizzle.all<Record<string, unknown>>(query)
}

/**
 * Run one way of the migration inside a transaction, as Payload does.
 * @param way - `up` or `down`
 */
async function migrate(way: typeof up | typeof down): Promise<void> {
  await payload.db.drizzle.transaction(async (tx) => {
    await way({ db: tx } as unknown as MigrateUpArgs & MigrateDownArgs)
  })
}

/**
 * Enter a territory in French, then its English name as the language switch stores it.
 * @param name - its French name
 * @param english - what is typed in English, or `null` for nothing
 * @returns its id
 */
async function territory(name: string, english: string | null): Promise<number> {
  const created = await payload.create({
    collection: 'territories',
    // English is required since 2026-11-23: the line lets the save pass, and the `down` below drops it with its table.
    data: { name, kind: 'county', otherNames: [{ language: 'en', form: 'Dropped by the down' }] },
    locale: 'fr',
  })
  if (english !== null) {
    await payload.db.drizzle.run(
      sql`INSERT INTO territories_locales (name, _locale, _parent_id) VALUES (${english}, 'en', ${created.id})`
    )
  }
  return created.id
}

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-territory-other-names-suite'
  const { getPayload, readMigrationFiles } = await import('payload')
  const { default: config } = await import('../payload.config')
  const { migrateBase } = await import('./migrateBase')
  payload = await getPayload({ config })
  await migrateBase(payload, databaseUrl, new Date(), await readMigrationFiles({ payload }))
  ponthieu = await territory('comté de Ponthieu', ' County of Ponthieu ')
  blank = await territory('comté de Blois', '   ')
  frenchOnly = await territory('comté de Nantes', null)
  // The base as it was before this migration: the table gone, the names where the language switch put them
  await migrate(down)
}, 60_000)

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

describe('territory_other_names', () => {
  describe('happy path', () => {
    it('copies an English name into the table, trimmed, and leaves the localized rows as they are', async () => {
      expect(await rows(sql`PRAGMA foreign_keys`)).toEqual([{ foreign_keys: 1 }])
      const before = await rows(sql`SELECT count(*) AS n FROM territories_locales`)
      await migrate(up)
      expect(
        await rows(sql`SELECT _order, _parent_id, language, form FROM territories_other_names`)
      ).toEqual([{ _order: 1, _parent_id: ponthieu, language: 'en', form: 'County of Ponthieu' }])
      expect(await rows(sql`SELECT count(*) AS n FROM territories_locales`)).toEqual(before)
    })

    it('hands the copied name to Payload as a line of the territory', async () => {
      const read = await payload.findByID({ collection: 'territories', id: ponthieu, locale: 'fr' })
      expect(read.otherNames?.map(({ language, form }) => [language, form])).toEqual([
        ['en', 'County of Ponthieu'],
      ])
    })
  })

  describe('variants', () => {
    it('copies nothing for a territory named in French only, or whose English name is blank', async () => {
      expect(
        await rows(
          sql`SELECT count(*) AS n FROM territories_other_names WHERE _parent_id IN (${blank}, ${frenchOnly})`
        )
      ).toEqual([{ n: 0 }])
    })
  })

  // L3–L4: N/A — static statements on one schema; what they must not do, lose a name or a territory, is the case below.
  describe('edge cases', () => {
    it('goes down by dropping its own table alone: every territory and every name stays', async () => {
      await migrate(down)
      expect(
        await rows(
          sql`SELECT count(*) AS n FROM sqlite_master WHERE name = 'territories_other_names'`
        )
      ).toEqual([{ n: 0 }])
      expect(await rows(sql`SELECT count(*) AS n FROM territories`)).toEqual([{ n: 3 }])
      expect(
        await rows(
          sql`SELECT name FROM territories_locales WHERE _parent_id = ${ponthieu} AND _locale = 'en'`
        )
      ).toEqual([{ name: ' County of Ponthieu ' }])
    })
  })
})
