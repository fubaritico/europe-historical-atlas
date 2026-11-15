import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { sql } from '@payloadcms/db-sqlite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Migration } from './migrateBase'
import type { Payload } from 'payload'

/**
 * The people migration (CMS-422, step 1) over a base that holds rows, as the dev's does — not only from an empty
 * one: a person, its name, a house, and an event pointing to the person, entered by SQL at the **old** schema, with
 * SQLite's foreign keys on as in his base; then the migration, and every row is where it was.
 */

/** The adapter's Drizzle, for the raw rows. */
interface Rows {
  all: (query: ReturnType<typeof sql>) => Promise<unknown[]>
  run: (query: ReturnType<typeof sql>) => Promise<unknown>
}

const folder = mkdtempSync(path.join(tmpdir(), 'cms-people-'))
const databaseUrl = `file:${path.join(folder, 'cms.db')}`
let payload: Payload
let db: Rows
let onDisk: Migration[]
let migrate: (migrations: readonly Migration[]) => Promise<unknown>

/**
 * The first row a query answers.
 * @param query - the query
 * @returns its first row
 */
async function first(query: ReturnType<typeof sql>): Promise<Record<string, unknown> | undefined> {
  return (await db.all(query))[0] as Record<string, unknown> | undefined
}

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-people-migration'
  const { getPayload, readMigrationFiles } = await import('payload')
  const { default: config } = await import('../payload.config')
  const { migrateBase } = await import('./migrateBase')
  payload = await getPayload({ config })
  db = (payload.db as unknown as { drizzle: Rows }).drizzle
  onDisk = await readMigrationFiles({ payload })
  migrate = (migrations) => migrateBase(payload, databaseUrl, new Date(), migrations)
  // The old schema: the initial migration alone, then rows the way the dev's base holds them
  await migrate(onDisk.filter((m) => m.name.endsWith('_initial')))
  await db.run(
    sql`INSERT INTO actors (id, kind, wikidata) VALUES (7, 'person', 'Q51720'), (14, 'house', 'Q75613')`
  )
  await db.run(
    sql`INSERT INTO actors_locales (_locale, _parent_id, name) VALUES ('fr', 7, 'Tancrède de Hauteville'), ('en', 7, 'Tancred'), ('fr', 14, 'Almoravides')`
  )
  await db.run(sql`INSERT INTO event_types (id) VALUES (1)`)
  await db.run(sql`INSERT INTO events (id, type_id, date_start_year) VALUES (3, 1, 1100)`)
  await db.run(sql`INSERT INTO events_rels (parent_id, path, actors_id) VALUES (3, 'actors', 7)`)
  await migrate(onDisk)
}, 60_000)

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

describe('the people migration over a base with rows', () => {
  it('keeps every person under its id, its kind and its Wikidata id', async () => {
    expect(await db.all(sql`SELECT id, kind, wikidata FROM people ORDER BY id`)).toEqual([
      { id: 7, kind: 'person', wikidata: 'Q51720' },
      { id: 14, kind: 'house', wikidata: 'Q75613' },
    ])
  })

  it('keeps every name, in every locale', async () => {
    expect(
      await db.all(
        sql`SELECT _parent_id, _locale, name FROM people_locales ORDER BY _parent_id, _locale`
      )
    ).toEqual([
      { _parent_id: 7, _locale: 'en', name: 'Tancred' },
      { _parent_id: 7, _locale: 'fr', name: 'Tancrède de Hauteville' },
      { _parent_id: 14, _locale: 'fr', name: 'Almoravides' },
    ])
  })

  it('keeps the event’s link to the person, now in the people column', async () => {
    expect(await first(sql`SELECT parent_id, path, people_id FROM events_rels`)).toEqual({
      parent_id: 3,
      path: 'actors',
      people_id: 7,
    })
  })

  it('leaves no foreign key broken, and the base whole', async () => {
    expect(await db.all(sql`PRAGMA foreign_key_check`)).toEqual([])
    expect(await first(sql`PRAGMA integrity_check`)).toEqual({ integrity_check: 'ok' })
  })

  it('reads the person through Payload, with the event that names it', async () => {
    const event = await payload.findByID({ collection: 'events', id: 3, depth: 1, locale: 'fr' })
    expect(event.actors).toEqual([
      expect.objectContaining({ id: 7, name: 'Tancrède de Hauteville' }),
    ])
  })

  it('takes a house for the person, and removing the house empties the field instead of the person', async () => {
    await payload.update({ collection: 'people', id: 7, data: { house: 14 } })
    expect(await first(sql`SELECT house_id FROM people WHERE id = 7`)).toEqual({ house_id: 14 })
    await db.run(sql`DELETE FROM people WHERE id = 14`)
    expect(await first(sql`SELECT id, house_id FROM people WHERE id = 7`)).toEqual({
      id: 7,
      house_id: null,
    })
  })

  it('refuses to be undone by migrate:down, the copy being the way back', async () => {
    const people = onDisk.find((m) => m.name.endsWith('_people'))
    await expect(people?.down({ db, payload, req: {} })).rejects.toThrow('put back the copy')
  })
})
