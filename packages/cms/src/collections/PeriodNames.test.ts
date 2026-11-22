import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { NAME_LANGUAGES } from '@europe-historical-atlas/core/data/periodName'

import { nameForms } from '../fields/nameForms'

import { LANGUAGE_LABELS, PeriodNames, validateForms } from './PeriodNames'
import { PlacePeriods } from './PlacePeriods'

import type { Payload } from 'payload'

/**
 * The names of the time (CMS-495) in a real base — Payload on a temporary SQLite file, never the dev's: Ankara and
 * its name of 1100, « Ancyre », entered as the form and the MCP send them; the label written by the server; what is
 * refused, and in which words.
 */

const folder = mkdtempSync(path.join(tmpdir(), 'cms-period-names-collection-'))
const databaseUrl = `file:${path.join(folder, 'cms.db')}`
let payload: Payload
let source: number
let ankara: number
let smyrna: number
let ancyre: number
let sheets: number[]

/**
 * Enter a name through a loose shape, so a refused one can be tried as the MCP would send it.
 * @param data - the name's fields
 * @returns the name saved
 */
function name(data: Record<string, unknown>) {
  return payload.create({ collection: 'period-names', data: data as never })
}

/**
 * Enter a sheet of 1100 for a place, pointing at a name.
 * @param place - the place
 * @param periodName - the name of the time
 * @param year - the sheet's year
 * @returns the sheet saved
 */
function sheet(place: number, periodName: number, year = 1100) {
  return payload.create({
    collection: 'place-periods',
    data: { place, periodName, date: { start: { year } }, importance: 'city' },
  })
}

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-period-names-collection-suite'
  const { getPayload, readMigrationFiles } = await import('payload')
  const { default: config } = await import('../payload.config')
  const { migrateBase } = await import('../migrate/migrateBase')
  payload = await getPayload({ config })
  await migrateBase(payload, databaseUrl, new Date(), await readMigrationFiles({ payload }))
  source = (
    await payload.create({ collection: 'sources', data: { title: 'Anne Comnène, Alexiade' } })
  ).id
  ankara = (
    await payload.create({
      collection: 'places',
      data: { name: 'Ankara', location: [32.85, 39.93] },
    })
  ).id
  smyrna = (
    await payload.create({
      collection: 'places',
      data: { name: 'Izmir', location: [27.14, 38.42] },
    })
  ).id
  ancyre = (
    await name({
      place: ankara,
      forms: [
        { language: 'en', form: ' Ancyra ' },
        { language: 'fr', form: 'Ancyre' },
      ],
      lines: [{ source, asWritten: 'Ἄγκυρα' }],
    })
  ).id
  // The two sheets every test below reads: the same name, two years
  sheets = [(await sheet(ankara, ancyre, 1100)).id, (await sheet(ankara, ancyre, 1200)).id]
}, 60_000)

/**
 * What a refused save says under its fields — Payload's own sentence for a refused field is generic (« le champ
 * suivant n'est pas valide »), the rule's words are in the error's data.
 * @param attempt - the save expected to be refused
 * @returns each field's sentence
 */
async function fieldSentences(attempt: Promise<unknown>): Promise<string[]> {
  try {
    await attempt
  } catch (error) {
    const data = (error as { data?: { errors?: { message?: string }[] } }).data
    return (data?.errors ?? []).map((issue) => issue.message ?? '')
  }
  throw new Error('the save was not refused')
}

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

describe('PeriodNames', () => {
  describe('happy path', () => {
    it('is the register « Noms d’époque », slug period-names, a required place', () => {
      expect(PeriodNames.slug).toBe('period-names')
      expect(PeriodNames.labels).toEqual({ singular: 'Nom d’époque', plural: 'Noms d’époque' })
      expect(
        PeriodNames.fields.find((field) => 'name' in field && field.name === 'place')
      ).toMatchObject({ type: 'relationship', relationTo: 'places', required: true })
    })

    it('writes the label from the forms, French first, the spaces around a form dropped', async () => {
      const saved = await payload.findByID({ collection: 'period-names', id: ancyre })
      expect(saved.label).toBe('Ancyre · Ancyra')
      expect(saved.forms.map(({ language, form }) => [language, form])).toEqual([
        ['en', 'Ancyra'],
        ['fr', 'Ancyre'],
      ])
    })

    it('is pointed at by the sheet of its place, and by the sheet of another year too', async () => {
      const { docs } = await payload.find({
        collection: 'place-periods',
        where: { id: { in: sheets } },
        depth: 0,
      })
      expect(docs.map((saved) => saved.periodName)).toEqual([ancyre, ancyre])
    })
  })

  describe('variants', () => {
    it('offers every language of core, each with its French label', () => {
      expect(Object.keys(LANGUAGE_LABELS)).toEqual([...NAME_LANGUAGES])
    })

    it('rewrites the label when a language is added', async () => {
      const saved = await payload.update({
        collection: 'period-names',
        id: ancyre,
        data: {
          forms: [
            { language: 'fr', form: 'Ancyre' },
            { language: 'en', form: 'Ancyra' },
            { language: 'de', form: 'Ankyra' },
          ],
        },
      })
      expect(saved.label).toBe('Ancyre · Ancyra · Ankyra')
    })

    it('is a field of the sheet that points at this register, offered for the sheet’s place only', () => {
      const field = PlacePeriods.fields.find(
        (entry) => 'name' in entry && entry.name === 'periodName'
      )
      expect(field).toMatchObject({ type: 'relationship', relationTo: 'period-names' })
      const filter = (field as unknown as { filterOptions: (args: { data: unknown }) => unknown })
        .filterOptions
      expect(filter({ data: { place: 67 } })).toEqual({ place: { equals: 67 } })
      expect(filter({ data: {} })).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('refuses a language written twice, naming it under the table', async () => {
      const said = await fieldSentences(
        name({
          place: ankara,
          forms: [
            { language: 'fr', form: 'Ancyre' },
            { language: 'fr', form: 'Angora' },
          ],
        })
      )
      expect(said.join(' ')).toContain('« Français » est saisie deux fois')
    })

    it('refuses a name with no form, in the rule’s own words', async () => {
      const said = await fieldSentences(name({ place: ankara, forms: [] }))
      expect(said.join(' ')).toContain('au moins une ligne')
      expect(validateForms(undefined)).toContain('au moins une ligne')
    })

    it('refuses to move to another place a name sheets cite, and says how many', async () => {
      await expect(
        payload.update({ collection: 'period-names', id: ancyre, data: { place: smyrna } })
      ).rejects.toThrow(
        'est cité par 2 fiche(s) de ville de son lieu : il ne peut pas changer de lieu'
      )
      const kept = await payload.findByID({ collection: 'period-names', id: ancyre, depth: 0 })
      expect(kept.place).toBe(ankara)
    })

    it('refuses a sheet the name of another place, in words that say so', async () => {
      await expect(sheet(smyrna, ancyre)).rejects.toThrow(
        'est celui d’un autre lieu : choisissez un nom de ce lieu, ou créez-le.'
      )
    })

    it('refuses to delete a name a sheet cites, and a place a name cites', async () => {
      await expect(payload.delete({ collection: 'period-names', id: ancyre })).rejects.toThrow(
        /Ce nom d’époque est cité par 2 fiche\(s\) de ville/
      )
      await expect(payload.delete({ collection: 'places', id: ankara })).rejects.toThrow(
        /Ce lieu est cité par/
      )
    })

    it('refuses to delete a source a name’s line cites', async () => {
      await expect(payload.delete({ collection: 'sources', id: source })).rejects.toThrow(
        /Cette source est citée par 1 nom\(s\) d’époque/
      )
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a language outside the list, and saves nothing', async () => {
      await expect(
        name({ place: smyrna, forms: [{ language: 'tlh', form: 'ʼanqara' }] })
      ).rejects.toThrow('Langue')
      const { totalDocs } = await payload.count({
        collection: 'period-names',
        where: { place: { equals: smyrna } },
      })
      expect(totalDocs).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('reads no form from what is not a table, and leaves out a row not yet filled', () => {
      expect(nameForms(undefined)).toEqual([])
      expect(
        nameForms([{ language: 'fr' }, { language: 'en', form: '  ' }, { form: 'x' }])
      ).toEqual([])
    })

    it('moves a name no sheet cites, then deletes it', async () => {
      const lone = await name({ place: ankara, forms: [{ language: 'fr', form: 'Smyrne' }] })
      const moved = await payload.update({
        collection: 'period-names',
        id: lone.id,
        data: { place: smyrna },
        depth: 0,
      })
      expect(moved.place).toBe(smyrna)
      await payload.delete({ collection: 'period-names', id: lone.id })
      const { totalDocs } = await payload.find({
        collection: 'period-names',
        where: { place: { equals: smyrna } },
      })
      expect(totalDocs).toBe(0)
    })
  })
})
