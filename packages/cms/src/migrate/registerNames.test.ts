import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { sql } from '@payloadcms/db-sqlite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { down, up } from '../migrations/20261123_175001_plain_french_register_names'

import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'
import type { Payload } from 'payload'

/**
 * The hand-written `plain_french_register_names` (CMS-495) on a real base, its foreign keys active as in the dev's: one
 * record in each of the five registers, its French name and its English one, moved from the tables of translations to
 * the column and the table of other names — and back. Never the dev's base: Payload on a temporary SQLite file,
 * brought to the schema before this migration by undoing it once.
 */

const folder = mkdtempSync(path.join(tmpdir(), 'cms-register-names-'))
const databaseUrl = `file:${path.join(folder, 'cms.db')}`
let payload: Payload

/** Each register: its table, and the French and English names of its record. */
const REGISTERS = [
  { table: 'people', fr: 'Tancrède de Hauteville', en: 'Tancred' },
  { table: 'confessions', fr: 'juive', en: 'Jewish' },
  { table: 'event_types', fr: 'Bataille', en: 'Battle' },
  { table: 'importance_reasons', fr: 'siège épiscopal', en: 'episcopal see' },
  { table: 'siege_engines', fr: 'Trébuchet à contrepoids', en: 'Counterweight trebuchet' },
] as const

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
 * One register's record, read from its column and its table of other names.
 * @param table - the register's table
 * @returns its French name and its English form
 */
async function namesIn(table: string): Promise<Record<string, unknown>[]> {
  return rows(
    sql.raw(
      `SELECT r.name AS fr, o.form AS en FROM ${table} r LEFT JOIN ${table}_other_names o ON o._parent_id = r.id AND o.language = 'en'`
    )
  )
}

const english = (form: string) => [{ language: 'en' as const, form }]

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-register-names-suite'
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
  const [person, confession, type, reason, engine] = REGISTERS
  await payload.create({
    collection: 'people',
    data: { name: person.fr, kind: 'person', otherNames: english(person.en) },
  })
  await payload.create({
    collection: 'confessions',
    data: { name: confession.fr, otherNames: english(confession.en) },
  })
  await payload.create({
    collection: 'event-types',
    data: { name: type.fr, icon: 'swords', colour: '#e3170a', otherNames: english(type.en) },
  })
  await payload.create({
    collection: 'importance-reasons',
    data: { name: reason.fr, otherNames: english(reason.en) },
  })
  const source = await payload.create({
    collection: 'sources',
    data: { title: 'A History of Siege Warfare', kind: 'scholarly' },
  })
  await payload.create({
    collection: 'siege-engines',
    data: {
      name: engine.fr,
      engine: 'counterweight-trebuchet',
      inUse: { start: { year: 1165 } },
      sources: [source.id],
      otherNames: english(engine.en),
    },
  })
  // The base as it was before this migration: each name in its table of translations, French and English
  await migrate(down)
}, 60_000)

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

describe('plain_french_register_names', () => {
  describe('happy path', () => {
    it('had each name in the tables of translations before it, in French and in English', async () => {
      for (const { table, fr, en } of REGISTERS) {
        expect(
          await rows(sql.raw(`SELECT _locale, name FROM ${table}_locales ORDER BY _locale`))
        ).toEqual([
          { _locale: 'en', name: en },
          { _locale: 'fr', name: fr },
        ])
      }
    })

    it('moves every register’s French name to its column and its English one to its table', async () => {
      expect(await rows(sql`PRAGMA foreign_keys`)).toEqual([{ foreign_keys: 1 }])
      await migrate(up)
      for (const { table, fr, en } of REGISTERS) {
        expect(await namesIn(table)).toEqual([{ fr, en }])
        expect(
          await rows(
            sql`SELECT count(*) AS n FROM sqlite_master WHERE name = ${`${table}_locales`}`
          )
        ).toEqual([{ n: 0 }])
      }
    })
  })

  // L2: N/A — one shape repeated over five registers, each asserted above. L3–L4: N/A — static statements on one schema.
  describe('edge cases', () => {
    it('goes down with every name back in the tables of translations', async () => {
      await migrate(down)
      for (const { table, fr, en } of REGISTERS) {
        expect(
          await rows(sql.raw(`SELECT _locale, name FROM ${table}_locales ORDER BY _locale`))
        ).toEqual([
          { _locale: 'en', name: en },
          { _locale: 'fr', name: fr },
        ])
      }
    })

    it('refuses to run while a record has no French name, and changes nothing', async () => {
      await payload.db.drizzle.run(sql`DELETE FROM confessions_locales WHERE _locale = 'fr'`)
      await expect(migrate(up)).rejects.toThrow()
      expect(
        await rows(sql`SELECT count(*) AS n FROM pragma_table_info('people') WHERE name = 'name'`)
      ).toEqual([{ n: 0 }])
      expect(await rows(sql`SELECT count(*) AS n FROM people_locales`)).toEqual([{ n: 2 }])
    })
  })
})
