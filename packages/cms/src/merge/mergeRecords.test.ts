import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { sql } from '@payloadcms/db-sqlite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { Sources } from '../collections/Sources'
import { Titles } from '../collections/Titles'

import { leftBehindOf, mergeRecords } from './mergeRecords'

import type { Payload } from 'payload'

/**
 * The merge of two duplicates on a base built by the migrations, as the dev's — the Ponthieu entered twice, the case
 * of 2026-11-23 (CMS-509).
 */

const folder = mkdtempSync(path.join(tmpdir(), 'cms-merge-'))
const databaseUrl = `file:${path.join(folder, 'cms.db')}`
let payload: Payload
let source: number

/** The English line every record of a register needs (CMS-495). */
const ENGLISH = [{ language: 'en' as const, form: 'An English name' }]

/**
 * A territory of the register.
 * @param name - its name
 * @param otherNames - its names in the other languages
 * @returns its id
 */
async function territory(name: string, otherNames = ENGLISH): Promise<number> {
  const created = await payload.create({
    collection: 'territories',
    data: { name, kind: 'county', otherNames },
  })
  return created.id
}

/**
 * A title held of a territory, over 1100.
 * @param person - the holder's name
 * @param land - the territory's id
 * @returns its id
 */
async function title(person: string, land: number): Promise<number> {
  const holder = await payload.create({
    collection: 'people',
    data: { name: person, kind: 'person', otherNames: ENGLISH },
  })
  const created = await payload.create({
    collection: 'titles',
    data: {
      person: holder.id,
      territory: land,
      date: { start: { year: 1100 } },
      lines: [{ source }],
    },
  })
  return created.id
}

/**
 * The territory a title holds, as stored.
 * @param id - the title
 * @returns the territory's id
 */
async function territoryOf(id: number): Promise<unknown> {
  return (await payload.findByID({ collection: 'titles', id, depth: 0 })).territory
}

/**
 * Whether a territory is in the bin.
 * @param id - the territory
 * @returns `true` when its bin date is set
 */
async function inBin(id: number): Promise<boolean> {
  const { docs } = await payload.find({
    collection: 'territories',
    where: { id: { equals: id } },
    trash: true,
  })
  return docs[0]?.deletedAt !== null && docs[0]?.deletedAt !== undefined
}

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-merge-suite'
  const { getPayload, readMigrationFiles } = await import('payload')
  const { buildConfig } = await import('payload')
  const { cmsConfig } = await import('../cmsConfig')
  // As the command builds it: real transactions, the merge all or nothing
  const config = await buildConfig(cmsConfig({ transactions: true }))
  const { migrateBase } = await import('../migrate/migrateBase')
  payload = await getPayload({ config })
  await migrateBase(
    payload,
    databaseUrl,
    new Date(),
    await readMigrationFiles({ payload }),
    () => []
  )
  source = (
    await payload.create({
      collection: 'sources',
      data: { title: 'Brunel, Les comtes de Ponthieu', kind: 'scholarly' },
    })
  ).id
}, 60_000)

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

describe('mergeRecords', () => {
  describe('happy path', () => {
    it('makes every title of the Ponthieu entered twice cite the one kept, and puts the other in the bin', async () => {
      const kept = await territory('comté de Ponthieu')
      const twin = await territory('Ponthieu')
      const first = await title('Gui Ier', twin)
      const second = await title('Enguerrand II', twin)

      const report = await mergeRecords(payload, {
        collection: 'territories',
        keep: kept,
        remove: twin,
      })

      expect([await territoryOf(first), await territoryOf(second), await inBin(twin)]).toEqual([
        kept,
        kept,
        true,
      ])
      expect(report.moved.map(({ collection, fields }) => [collection, fields])).toEqual([
        ['titles', ['territory']],
        ['titles', ['territory']],
      ])
    }, 60_000)
  })

  describe('variants', () => {
    it('moves a source cited inside the lines of a title', async () => {
      const twin = (
        await payload.create({
          collection: 'sources',
          data: { title: 'Brunel 1930', kind: 'scholarly' },
        })
      ).id
      const land = await territory('comté de Vimeu')
      const holder = await payload.create({
        collection: 'people',
        data: { name: 'Hugues', kind: 'person', otherNames: ENGLISH },
      })
      const cited = await payload.create({
        collection: 'titles',
        data: {
          person: holder.id,
          territory: land,
          date: { start: { year: 1100 } },
          lines: [{ source: twin }],
        },
      })

      await mergeRecords(payload, { collection: 'sources', keep: source, remove: twin })

      const after = await payload.findByID({ collection: 'titles', id: cited.id, depth: 0 })
      expect(after.lines?.map(({ source: one }) => one)).toEqual([source])
    }, 60_000)

    it('says what the record merged away held of its own, not merged', async () => {
      const kept = await territory('comté de Guînes')
      const twin = await territory('Guînes', [{ language: 'en', form: 'County of Guînes' }])
      const report = await mergeRecords(payload, {
        collection: 'territories',
        keep: kept,
        remove: twin,
      })
      expect(report.leftBehind).toContain('otherNames')
    }, 60_000)
  })

  describe('managed errors', () => {
    it('refuses a collection with no bin, a record merged with itself, a record missing or in the bin', async () => {
      const kept = await territory('comté de Boulogne')
      const twin = await territory('Boulogne')
      await expect(
        mergeRecords(payload, { collection: 'events', keep: 1, remove: 2 })
      ).rejects.toThrow('n’a pas de corbeille')
      await expect(
        mergeRecords(payload, { collection: 'territories', keep: kept, remove: kept })
      ).rejects.toThrow('la même')
      await expect(
        mergeRecords(payload, { collection: 'territories', keep: kept, remove: 999_999 })
      ).rejects.toThrow('n’existe pas')
      await payload.update({
        collection: 'territories',
        id: twin,
        data: { deletedAt: new Date().toISOString() },
      })
      await expect(
        mergeRecords(payload, { collection: 'territories', keep: kept, remove: twin })
      ).rejects.toThrow('est dans la corbeille')
    }, 60_000)

    // One transaction: a merge two titles would collide in leaves the base as it was
    it('writes nothing when a move would make two titles one, and names the clash', async () => {
      const kept = await territory('comté de Montreuil')
      const twin = await territory('Montreuil')
      const holder = await payload.create({
        collection: 'people',
        data: { name: 'Hilduin', kind: 'person', otherNames: ENGLISH },
      })
      const date = { start: { year: 1100 } }
      await payload.create({
        collection: 'titles',
        data: { person: holder.id, territory: kept, date, lines: [{ source }] },
      })
      const clashing = await payload.create({
        collection: 'titles',
        data: { person: holder.id, territory: twin, date, lines: [{ source }] },
      })
      const untouched = await title('Hugues de Montreuil', twin)

      await expect(
        mergeRecords(payload, { collection: 'territories', keep: kept, remove: twin })
      ).rejects.toThrow('existe déjà')

      expect([
        await territoryOf(clashing.id),
        await territoryOf(untouched),
        await inBin(twin),
      ]).toEqual([twin, twin, false])
    }, 60_000)
  })

  // Review ARCH-002: a person whose father is his own duplicate would become his own father
  describe('a record citing itself', () => {
    it('refuses to merge a person into his son’s duplicate, naming the field, and writes nothing', async () => {
      const twin = await payload.create({
        collection: 'people',
        data: { name: 'Gui de Ponthieu', kind: 'person', otherNames: ENGLISH },
      })
      const kept = await payload.create({
        collection: 'people',
        data: { name: 'Gui Ier', kind: 'person', otherNames: ENGLISH, father: twin.id },
      })
      await expect(
        mergeRecords(payload, { collection: 'people', keep: kept.id, remove: twin.id })
      ).rejects.toThrow('se citerait elle-même')
      expect((await payload.findByID({ collection: 'people', id: kept.id, depth: 0 })).father).toBe(
        twin.id
      )
    }, 60_000)

    // Review QUAL-004: a house its own founder never holds back its own removal
    // The form refuses a house as its own founder (a founder is a person): only a write straight into the base makes one
    it('puts in the bin a house that names itself its founder', async () => {
      const house = await payload.create({
        collection: 'people',
        data: { name: 'Maison de Montreuil', kind: 'house', otherNames: ENGLISH },
      })
      const db = payload.db as unknown as {
        drizzle: { run: (query: ReturnType<typeof sql>) => Promise<unknown> }
      }
      await db.drizzle.run(sql`UPDATE people SET founder_id = ${house.id} WHERE id = ${house.id}`)
      const binned = await payload.update({
        collection: 'people',
        id: house.id,
        data: { deletedAt: new Date().toISOString() },
      })
      expect(binned.deletedAt).toBeTruthy()
    }, 60_000)
  })

  // L4: a failing base is Payload's own, inside the transaction the merge rolls back — the clash above is that path.

  describe('edge cases', () => {
    it('merges a record nothing cites: nothing moved, the twin in the bin', async () => {
      const kept = await territory('comté d’Eu')
      const twin = await territory('Eu')
      const report = await mergeRecords(payload, {
        collection: 'territories',
        keep: kept,
        remove: twin,
      })
      expect([report.moved, await inBin(twin)]).toEqual([[], true])
    }, 60_000)
  })
})

describe('leftBehindOf', () => {
  it('lists the fields the record merged away holds otherwise, never its id, dates or server-written names', () => {
    expect(
      leftBehindOf(
        Titles.fields,
        { id: 1, label: 'A', sovereign: false, createdAt: 'x' },
        { id: 2, label: 'B', sovereign: true, createdAt: 'y', lines: [] }
      )
    ).toEqual(['sovereign'])
  })

  // Review QUAL-001: a source's title is typed by hand, never written by the server
  it('lists a source’s title, typed by hand, when the two differ', () => {
    expect(
      leftBehindOf(Sources.fields, { id: 1, title: 'Brunel' }, { id: 2, title: 'Brunel 1930' })
    ).toEqual(['title'])
  })
})
