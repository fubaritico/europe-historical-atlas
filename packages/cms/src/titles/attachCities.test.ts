import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { AttachRefusal, attachCities } from './attachCities'

import type { Payload } from 'payload'

/**
 * The operation on a base of its own (CMS-507), every migration applied, so the sheet's own rules and hooks run as on
 * the dev's base: the cities of the county of Toulouse in 1100.
 */

const folder = mkdtempSync(path.join(tmpdir(), 'cms-attach-'))
const databaseUrl = `file:${path.join(folder, 'cms.db')}`
const ENGLISH = [{ language: 'en' as const, form: 'An English name' }]
let payload: Payload
let source: number
let raymond: number
let bare: number
let other: number

/**
 * A place, by its name.
 * @param name - its name
 * @returns its id
 */
async function place(name: string): Promise<number> {
  const created = await payload.create({
    collection: 'places',
    data: { name, otherNames: ENGLISH, location: [1.44, 43.6] } as never,
  })
  return created.id
}

/**
 * A sheet of 1100 for a place.
 * @param of - the place
 * @param rest - what else it holds
 * @returns its id
 */
async function sheet1100(of: number, rest: Record<string, unknown> = {}): Promise<number> {
  const created = await payload.create({
    collection: 'place-periods',
    data: { place: of, date: { start: { year: 1100 } }, importance: 'city', ...rest } as never,
  })
  return created.id
}

/**
 * A title of a territory, held over some years.
 * @param territory - its territory's name and Wikidata id
 * @param territory.name - the name
 * @param territory.wikidata - the id
 * @param from - its first year
 * @param to - its last year
 * @param lines - its source lines
 * @returns its id
 */
async function title(
  territory: { name: string; wikidata: string | null },
  from: number,
  to: number,
  lines: unknown[]
): Promise<number> {
  const person = await payload.create({
    collection: 'people',
    data: { name: `holder of ${territory.name}`, kind: 'person', otherNames: ENGLISH },
  })
  const land = await payload.create({
    collection: 'territories',
    data: { ...territory, kind: 'county', otherNames: ENGLISH } as never,
  })
  const created = await payload.create({
    collection: 'titles',
    data: {
      person: person.id,
      territory: land.id,
      date: { start: { year: from }, end: { year: to } },
      lines,
    } as never,
  })
  return created.id
}

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-attach-suite'
  const { getPayload, readMigrationFiles } = await import('payload')
  const { default: config } = await import('../payload.config')
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
      data: { title: 'Histoire générale de Languedoc' },
    })
  ).id
  raymond = await title({ name: 'comté de Toulouse', wikidata: 'Q1334322' }, 1094, 1105, [
    { source, where: 't. III, p. 480', quotation: 'Raymond, comte de Toulouse' },
  ])
  bare = await title({ name: 'vicomté de Nîmes', wikidata: null }, 1090, 1110, [])
  other = await title({ name: 'vicomté d’Albi', wikidata: null }, 1090, 1110, [{ source }])
}, 60_000)

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

describe('attachCities', () => {
  describe('happy path', () => {
    it('makes the sheet of a city with none in 1100, held by the title, its holder inferred from the district', async () => {
      const nimes = await place('Nîmes')
      const [result] = await attachCities(payload, raymond, 1100, [nimes])
      expect(result).toMatchObject({ place: nimes, name: 'Nîmes', result: 'created' })
      const made = await payload.findByID({
        collection: 'place-periods',
        id: Number(result?.sheet),
        depth: 0,
      })
      expect(made).toMatchObject({
        date: { start: { year: 1100 } },
        importance: 'city',
        showInAtlas: false,
        holderTitle: raymond,
      })
      expect(made.testimonies).toEqual([
        expect.objectContaining({
          source,
          subject: 'holder',
          holderName: 'comté de Toulouse',
          holderQid: 'Q1334322',
          byDistrict: true,
          where: 't. III, p. 480',
          quotation: 'Raymond, comte de Toulouse',
        }),
      ])
    }, 60_000)

    it('attaches the title to a sheet held by nobody, its lines kept', async () => {
      const carcassonne = await place('Carcassonne')
      const id = await sheet1100(carcassonne, {
        testimonies: [{ source, subject: 'population', population: 5000 }],
      })
      const [result] = await attachCities(payload, raymond, 1100, [carcassonne])
      expect(result).toMatchObject({ result: 'attached', sheet: id })
      const saved = await payload.findByID({ collection: 'place-periods', id, depth: 0 })
      expect(saved.holderTitle).toBe(raymond)
      expect(saved.testimonies?.map((line) => [line.subject, line.byDistrict])).toEqual([
        ['population', false],
        ['holder', true],
      ])
    }, 60_000)
  })

  describe('variants', () => {
    it('changes nothing for a city the title already holds', async () => {
      const toulouse = await place('Toulouse')
      const id = await sheet1100(toulouse, { holderTitle: raymond })
      expect(await attachCities(payload, raymond, 1100, [toulouse])).toEqual([
        { place: toulouse, name: 'Toulouse', result: 'unchanged', sheet: id },
      ])
    }, 60_000)
  })

  describe('managed errors', () => {
    it('leaves a city held by another title, and one a line gives to a bishop, as they are', async () => {
      const albi = await place('Albi')
      const rodez = await place('Rodez')
      const albiSheet = await sheet1100(albi, { holderTitle: other })
      const bishop = { source, subject: 'holder', holderName: 'évêché de Rodez', holderQid: null }
      const rodezSheet = await sheet1100(rodez, { testimonies: [bishop] })
      const results = await attachCities(payload, raymond, 1100, [albi, rodez])
      expect(results).toEqual([
        expect.objectContaining({
          result: 'conflict',
          reason: { kind: 'otherTitle', title: other },
        }),
        expect.objectContaining({
          result: 'conflict',
          reason: { kind: 'otherLine', holder: 'évêché de Rodez' },
        }),
      ])
      const albiAfter = await payload.findByID({
        collection: 'place-periods',
        id: albiSheet,
        depth: 0,
      })
      const rodezAfter = await payload.findByID({
        collection: 'place-periods',
        id: rodezSheet,
        depth: 0,
      })
      expect([
        albiAfter.holderTitle,
        rodezAfter.holderTitle,
        rodezAfter.testimonies?.length,
      ]).toEqual([other, null, 1])
    }, 60_000)

    it('refuses a year outside the title’s years, and writes nothing', async () => {
      const beziers = await place('Béziers')
      await expect(attachCities(payload, raymond, 1110, [beziers])).rejects.toThrow(
        new AttachRefusal('L’année 1110 sort des années du titre (1094–1105).')
      )
      const { totalDocs } = await payload.find({
        collection: 'place-periods',
        where: { place: { equals: beziers } },
      })
      expect(totalDocs).toBe(0)
    }, 60_000)

    it('refuses a title with no source line to infer from', async () => {
      const uzes = await place('Uzès')
      await expect(attachCities(payload, bare, 1100, [uzes])).rejects.toThrow(
        'aucune ligne de source'
      )
    }, 60_000)
  })

  describe('unmanaged errors', () => {
    it('says a city that cannot be found, logs it, and goes on with the others', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const agde = await place('Agde')
      const results = await attachCities(payload, raymond, 1100, [999_999, agde])
      expect(results[0]).toMatchObject({
        place: 999_999,
        name: 'lieu 999999',
        result: 'failed',
        sheet: null,
      })
      expect(results[1]).toMatchObject({ place: agde, result: 'created' })
      expect(error).toHaveBeenCalledWith(
        `[CMS] attaching lieu 999999 to title ${String(raymond)} failed`,
        expect.any(Error)
      )
      error.mockRestore()
    }, 60_000)
  })
})
