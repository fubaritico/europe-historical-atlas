import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { sql } from '@payloadcms/db-sqlite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { down, up } from '../migrations/20261128_010000_hierarchy_links'

import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'
import type { Payload } from 'payload'

/**
 * The hand-written rename of the « vassal links » into hierarchy links (REPO-589) on a real base, its foreign keys
 * active as in the dev's, inside a transaction as Payload runs a migration: every link and source line kept, the
 * references other tables hold following the table's new name. Never the dev's base: Payload on a temporary file.
 */

const folder = mkdtempSync(path.join(tmpdir(), 'cms-hierarchy-links-'))
const databaseUrl = `file:${path.join(folder, 'cms.db')}`
let payload: Payload

/** The English line every territory and person needs (CMS-495) — not what this suite is about. */
const ENGLISH = [{ language: 'en' as const, form: 'An English name' }]

/**
 * One number the base answers.
 * @param query - a query answering one row of one column
 * @returns the number
 */
async function count(query: ReturnType<typeof sql>): Promise<number> {
  const rows = await payload.db.drizzle.all<Record<string, number>>(query)
  return Object.values(rows[0] ?? {})[0] ?? Number.NaN
}

/**
 * The tables a table's foreign keys point at.
 * @param table - the table
 * @returns their names, sorted
 */
async function referenced(table: string): Promise<string[]> {
  const rows = await payload.db.drizzle.all<{ table: string }>(
    sql.raw(`SELECT "table" FROM pragma_foreign_key_list('${table}')`)
  )
  return rows.map((row) => row.table).sort()
}

/**
 * The names of the base's indexes that start with a prefix.
 * @param prefix - their start
 * @returns the names, sorted
 */
async function indexesStartingWith(prefix: string): Promise<string[]> {
  const rows = await payload.db.drizzle.all<{ name: string }>(
    sql.raw(
      `SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE '${prefix}%' ORDER BY name`
    )
  )
  return rows.map((row) => row.name)
}

/**
 * A title for a person and a territory, from 1084 to 1103.
 * @param name - the territory's name
 * @param source - the source its line cites
 * @returns the title's id
 */
async function title(name: string, source: number): Promise<number> {
  const person = await payload.create({
    collection: 'people',
    data: { name: `holder of ${name}`, kind: 'person', otherNames: ENGLISH },
  })
  const territory = await payload.create({
    collection: 'territories',
    data: { name, kind: 'county', otherNames: ENGLISH },
  })
  const created = await payload.create({
    collection: 'titles',
    data: {
      person: person.id,
      territory: territory.id,
      date: { start: { year: 1084 }, end: { year: 1103 } },
      lines: [{ source }],
    },
  })
  return created.id
}

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-hierarchy-links-suite'
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
    data: { title: 'Chédeville et Tonnerre 1987', kind: 'scholarly' },
  })
  const vassal = await title('comté de Nantes', source.id)
  const suzerain = await title('duché de Bretagne', source.id)
  await payload.create({
    collection: 'hierarchy-links',
    data: {
      vassal,
      answersTo: 'suzerain',
      suzerain,
      date: { start: { year: 1084 }, end: { year: 1103 } },
      lines: [{ source: source.id }],
    },
  })
}, 60_000)

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

describe('hierarchy links, the rename', () => {
  describe('happy path', () => {
    it('goes back to the vassal links and forth again, every link and line kept, foreign keys active', async () => {
      expect(await count(sql`PRAGMA foreign_keys`)).toBe(1)

      await payload.db.drizzle.transaction(async (tx) => {
        await down({ db: tx } as unknown as MigrateDownArgs)
      })
      const back = [
        await count(sql`SELECT count(*) FROM vassal_links`),
        await count(sql`SELECT count(*) FROM vassal_links_lines`),
        await referenced('vassal_links_lines'),
        await count(
          sql`SELECT count(*) FROM pragma_table_info('payload_mcp_api_keys') WHERE name = 'vassal_links_find'`
        ),
      ]
      await payload.db.drizzle.transaction(async (tx) => {
        await up({ db: tx } as unknown as MigrateUpArgs)
      })

      expect(back).toEqual([1, 1, ['sources', 'vassal_links'], 1])
      expect([
        await count(sql`SELECT count(*) FROM hierarchy_links`),
        await count(sql`SELECT count(*) FROM hierarchy_links_lines`),
        await count(sql`SELECT count(*) FROM pragma_foreign_key_check`),
      ]).toEqual([1, 1, 0])
    })
  })

  describe('variants', () => {
    it('points the lines and the locks at the renamed table', async () => {
      expect(await referenced('hierarchy_links_lines')).toEqual(['hierarchy_links', 'sources'])
      expect(await referenced('payload_locked_documents_rels')).toContain('hierarchy_links')
      expect(await referenced('payload_locked_documents_rels')).not.toContain('vassal_links')
    })

    it('leaves no index under the old name, and every new one in place', async () => {
      expect(await indexesStartingWith('vassal_links')).toEqual([])
      expect(await indexesStartingWith('hierarchy_links')).toEqual([
        'hierarchy_links_created_at_idx',
        'hierarchy_links_deleted_at_idx',
        'hierarchy_links_lines_order_idx',
        'hierarchy_links_lines_parent_id_idx',
        'hierarchy_links_lines_source_idx',
        'hierarchy_links_suzerain_idx',
        'hierarchy_links_updated_at_idx',
        'hierarchy_links_vassal_idx',
      ])
    })
  })

  // L3–L5: N/A — one list of renames on one known schema, no input; its one failure, a reference left on the old
  // name (legacy_alter_table on), is what the variants above assert.
})
