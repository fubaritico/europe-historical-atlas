import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { sql } from '@payloadcms/db-sqlite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { down, up } from '../migrations/20261123_164622_place_other_names'
import { down as plainDown, up as plainUp } from '../migrations/20261123_173436_plain_french_names'

import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'
import type { Payload } from 'payload'

/**
 * The hand-written copy of `place_other_names` (CMS-495) on a real base, its foreign keys active as in the dev's: the
 * English names the catch-up wrote into the localized rows become lines of the new table, the localized rows left as
 * they are. Never the dev's base: Payload on a temporary SQLite file, brought to the schema before this migration by
 * undoing it once, then filled, then migrated up and down by hand.
 */

const folder = mkdtempSync(path.join(tmpdir(), 'cms-place-other-names-'))
const databaseUrl = `file:${path.join(folder, 'cms.db')}`
let payload: Payload
let ankara: number
let blank: number
let frenchOnly: number
let sheet: number

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
async function migrate(
  way: typeof up | typeof down | typeof plainUp | typeof plainDown
): Promise<void> {
  await payload.db.drizzle.transaction(async (tx) => {
    await way({ db: tx } as unknown as MigrateUpArgs & MigrateDownArgs)
  })
}

/**
 * Enter a place, as the base holds one today.
 * @param name - its French name
 * @returns its id
 */
async function place(name: string): Promise<number> {
  const created = await payload.create({
    collection: 'places',
    // English is required: the line lets the save pass, and the `down` below drops it with its table.
    data: {
      name,
      location: [32.85, 39.93],
      otherNames: [{ language: 'en', form: 'Dropped by the down' }],
    },
    locale: 'fr',
  })
  return created.id
}

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-place-other-names-suite'
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
  ankara = await place('Ankara')
  blank = await place('Blois')
  frenchOnly = await place('Nantes')
  // A city sheet on Ankara, so the way down is seen to keep what points at a place
  sheet = (
    await payload.create({
      collection: 'place-periods',
      data: { place: ankara, date: { start: { year: 1100 } }, importance: 'city' },
    })
  ).id
  // The base as it was before this migration: the table gone, the names where the catch-up put them
  // The names now French alone (`plain_french_names`) are undone first, then this migration; the English rows the
  // undoing copied back from the table are replaced by the ones the test is about
  await migrate(plainDown)
  await migrate(down)
  await payload.db.drizzle.run(sql`DELETE FROM places_locales WHERE _locale = 'en'`)
  await payload.db.drizzle.run(
    sql`INSERT INTO places_locales (name, _locale, _parent_id) VALUES (' Ankara ', 'en', ${ankara})`
  )
  await payload.db.drizzle.run(
    sql`INSERT INTO places_locales (name, _locale, _parent_id) VALUES ('   ', 'en', ${blank})`
  )
}, 60_000)

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

describe('place_other_names', () => {
  describe('happy path', () => {
    it('copies an English name into the table, trimmed, and leaves the localized rows as they are', async () => {
      expect(await rows(sql`PRAGMA foreign_keys`)).toEqual([{ foreign_keys: 1 }])
      const before = await rows(sql`SELECT count(*) AS n FROM places_locales`)
      await migrate(up)
      expect(
        await rows(sql`SELECT _order, _parent_id, language, form FROM places_other_names`)
      ).toEqual([{ _order: 1, _parent_id: ankara, language: 'en', form: 'Ankara' }])
      expect(await rows(sql`SELECT count(*) AS n FROM places_locales`)).toEqual(before)
      // The base back to today's schema, for Payload to read it
      await migrate(plainUp)
    })

    it('hands the copied name to Payload as a line of the place', async () => {
      const read = await payload.findByID({ collection: 'places', id: ankara, locale: 'fr' })
      expect(read.otherNames?.map(({ language, form }) => [language, form])).toEqual([
        ['en', 'Ankara'],
      ])
    })
  })

  describe('variants', () => {
    it('copies nothing for a place named in French only, or whose English row is blank', async () => {
      expect(
        await rows(
          sql`SELECT count(*) AS n FROM places_other_names WHERE _parent_id IN (${blank}, ${frenchOnly})`
        )
      ).toEqual([{ n: 0 }])
    })
  })

  // L3–L4: N/A — static statements on one schema; what they must not do, lose a name, a place or a sheet, is below.
  describe('edge cases', () => {
    it('goes down by dropping its own table alone: every place, sheet and name stays', async () => {
      await migrate(plainDown)
      await migrate(down)
      expect(
        await rows(sql`SELECT count(*) AS n FROM sqlite_master WHERE name = 'places_other_names'`)
      ).toEqual([{ n: 0 }])
      expect(await rows(sql`SELECT count(*) AS n FROM places`)).toEqual([{ n: 3 }])
      expect(await rows(sql`SELECT place_id FROM place_periods WHERE id = ${sheet}`)).toEqual([
        { place_id: ankara },
      ])
      expect(
        await rows(
          sql`SELECT name FROM places_locales WHERE _parent_id = ${ankara} AND _locale = 'en'`
        )
        // the localized row is the table's line again, trimmed, once `plain_french_names` has run and been undone
      ).toEqual([{ name: 'Ankara' }])
    })

    // `plain_french_names` copies each French name into a required column: a place with none fails the migration,
    // which writes nothing, rather than an empty name
    it('refuses to make the names French alone while a place has no French name, and changes nothing', async () => {
      await migrate(up)
      await payload.db.drizzle.run(
        sql`DELETE FROM places_locales WHERE _parent_id = ${frenchOnly} AND _locale = 'fr'`
      )
      await expect(migrate(plainUp)).rejects.toThrow()
      expect(
        await rows(sql`SELECT count(*) AS n FROM pragma_table_info('places') WHERE name = 'name'`)
      ).toEqual([{ n: 0 }])
      expect(
        await rows(sql`SELECT count(*) AS n FROM places_locales WHERE _locale = 'fr'`)
      ).toEqual([{ n: 2 }])
    })
  })
})
