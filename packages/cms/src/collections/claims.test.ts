import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { chainPaths, vassalChain } from '@europe-historical-atlas/core/data/vassalChain'

import { vassalLinkOf } from '../fields/vassalLinkOf'

import type { VassalLink } from '@europe-historical-atlas/core/data/vassalChain'
import type { Payload } from 'payload'

/**
 * The registers of CMS-422 step 2 in a real base — Payload on a temporary SQLite file, never the dev's: Nantes in
 * 1100 entered as the plan tells it (three people, three territories, three titles, three links, the king's link
 * « to no one »), entered once before every test; each name written by the server; the chain of the count of
 * Nantes computed by `core` from what the base holds.
 */

const folder = mkdtempSync(path.join(tmpdir(), 'cms-claims-'))
const databaseUrl = `file:${path.join(folder, 'cms.db')}`
let payload: Payload
let source: number
let count: number
let duke: number
let king: number
let nantes: number

/**
 * A date group from one year to another, both included.
 * @param from - the first year
 * @param to - the last
 * @returns the group
 */
function years(from: number, to: number) {
  return { start: { year: from }, end: { year: to } }
}

/**
 * Enter a link — through a loose shape, so a refused one can be tried as the MCP would send it.
 * @param data - the link's fields
 * @returns the link saved
 */
function link(data: Record<string, unknown>) {
  return payload.create({ collection: 'vassal-links', data: data as never })
}

/**
 * Enter a person, a territory and their title.
 * @param person - the holder's name
 * @param territory - the territory's name and kind
 * @param from - the title's first year
 * @param to - its last
 * @returns the ids of the title and the territory
 */
async function title(
  person: string,
  territory: { name: string; kind: 'county' | 'duchy' | 'kingdom' },
  from: number,
  to: number
): Promise<{ title: number; territory: number }> {
  const holder = await payload.create({
    collection: 'people',
    data: { name: person, kind: 'person' },
  })
  const land = await payload.create({ collection: 'territories', data: territory })
  const created = await payload.create({
    collection: 'titles',
    data: { person: holder.id, territory: land.id, date: years(from, to), lines: [{ source }] },
  })
  return { title: created.id, territory: land.id }
}

/**
 * The links the base holds, read as `core`'s chain reads them.
 * @returns the links
 */
async function storedLinks(): Promise<VassalLink[]> {
  const { docs } = await payload.find({ collection: 'vassal-links', depth: 0, pagination: false })
  return docs.map(vassalLinkOf).filter((read): read is VassalLink => read !== null)
}

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-claims-suite'
  const { getPayload, readMigrationFiles } = await import('payload')
  const { default: config } = await import('../payload.config')
  const { migrateBase } = await import('../migrate/migrateBase')
  payload = await getPayload({ config })
  await migrateBase(payload, databaseUrl, new Date(), await readMigrationFiles({ payload }))
  const created = await payload.create({
    collection: 'sources',
    data: { title: 'Chédeville et Tonnerre 1987', kind: 'scholarly' },
  })
  source = created.id
  const countOf = await title('Mathias II', { name: 'comté de Nantes', kind: 'county' }, 1084, 1103)
  count = countOf.title
  nantes = countOf.territory
  duke = (await title('Alain IV', { name: 'duché de Bretagne', kind: 'duchy' }, 1084, 1112)).title
  king = (await title('Philippe Ier', { name: 'royaume de France', kind: 'kingdom' }, 1060, 1108))
    .title
  const lines = [{ source }]
  await link({
    vassal: count,
    answersTo: 'suzerain',
    suzerain: duke,
    date: years(1084, 1103),
    lines,
  })
  await link({
    vassal: duke,
    answersTo: 'suzerain',
    suzerain: king,
    date: years(1084, 1112),
    lines,
  })
  await link({ vassal: king, answersTo: 'no-one', date: years(1060, 1108), lines })
}, 60_000)

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

/**
 * Enter a place, a source of its own and its sheet for 1100, as the historian does for a village.
 * @param name - the place's name
 * @returns the three ids
 */
async function entered(name: string): Promise<{ place: number; own: number; sheet: number }> {
  const place = await payload.create({
    collection: 'places',
    data: { name, location: [7.0, 51.2] },
  })
  const own = await payload.create({
    collection: 'sources',
    data: { title: `Page de ${name}`, kind: 'scholarly' },
  })
  const sheet = await payload.create({
    collection: 'place-periods',
    data: {
      place: place.id,
      date: { start: { year: 1100 } },
      importance: 'city',
      testimonies: [{ source: own.id, subject: 'importance', importance: 'city' }],
    },
  })
  return { place: place.id, own: own.id, sheet: sheet.id }
}

describe('titles and links', () => {
  describe('happy path', () => {
    it('writes a title’s name from its holder, its territory and its years', async () => {
      expect((await payload.findByID({ collection: 'titles', id: count })).label).toBe(
        'Mathias II — comté de Nantes, 1084–1103'
      )
    })

    it('gives the chain of Nantes in 1100 from what the base holds: count → duke → king, sovereign', async () => {
      expect(chainPaths(vassalChain(String(count), 1100, await storedLinks()))).toEqual([
        { titles: [String(count), String(duke), String(king)], end: 'sovereign' },
      ])
    })
  })

  describe('variants', () => {
    it('names the king’s link « → personne », and holds no suzerain on it', async () => {
      const { docs } = await payload.find({
        collection: 'vassal-links',
        where: { vassal: { equals: king } },
        depth: 0,
      })
      expect(docs.map((saved) => [saved.label, saved.suzerain ?? null])).toEqual([
        ['Philippe Ier — royaume de France, 1060–1108 → personne', null],
      ])
    })

    it('renames the titles and their links when a territory is renamed', async () => {
      await payload.update({
        collection: 'territories',
        id: nantes,
        data: { name: 'comté nantais' },
      })
      expect((await payload.findByID({ collection: 'titles', id: count })).label).toBe(
        'Mathias II — comté nantais, 1084–1103'
      )
      const { docs } = await payload.find({
        collection: 'vassal-links',
        where: { vassal: { equals: count } },
        depth: 0,
      })
      expect(docs[0]?.label).toBe(
        'Mathias II — comté nantais, 1084–1103 → Alain IV — duché de Bretagne, 1084–1112'
      )
    }, 60_000)

    it('renames the titles and the links where they are the suzerain when a person is renamed', async () => {
      const ofDuke = await payload.findByID({ collection: 'titles', id: duke, depth: 0 })
      await payload.update({
        collection: 'people',
        id: ofDuke.person as number,
        data: { name: 'Alain Fergent' },
      })
      expect((await payload.findByID({ collection: 'titles', id: duke })).label).toBe(
        'Alain Fergent — duché de Bretagne, 1084–1112'
      )
      const { docs } = await payload.find({
        collection: 'vassal-links',
        where: { suzerain: { equals: duke } },
        depth: 0,
      })
      expect(docs[0]?.label?.endsWith('→ Alain Fergent — duché de Bretagne, 1084–1112')).toBe(true)
    }, 60_000)

    it('empties the suzerain of a « no one » link even when one was sent with it', async () => {
      const aquitaine = (
        await title('Guillaume IX', { name: 'duché d’Aquitaine', kind: 'duchy' }, 1086, 1126)
      ).title
      const saved = await link({
        vassal: aquitaine,
        answersTo: 'no-one',
        suzerain: king,
        date: years(1100, 1100),
        lines: [{ source }],
      })
      expect([saved.suzerain ?? null, saved.label]).toEqual([
        null,
        'Guillaume IX — duché d’Aquitaine, 1086–1126 → personne',
      ])
    }, 60_000)
  })

  describe('edge cases', () => {
    it('lets a title be saved again, and a divergent reading in — another suzerain, other years', async () => {
      await payload.update({ collection: 'titles', id: count, data: {} })
      const first = await payload.findByID({ collection: 'titles', id: count, depth: 0 })
      const other = await payload.create({
        collection: 'titles',
        data: {
          person: first.person,
          territory: first.territory,
          date: years(1084, 1104),
          lines: [{ source }],
        },
      })
      const divergent = await link({
        vassal: count,
        answersTo: 'suzerain',
        suzerain: king,
        date: years(1100, 1100),
        lines: [{ source }],
      })
      // Gone again, so the refusals after it count only the base of `beforeAll`
      await payload.delete({ collection: 'vassal-links', id: divergent.id })
      await payload.delete({ collection: 'titles', id: other.id })
    })

    it('lets any number of records go without a Wikidata id, empty or absent', async () => {
      await payload.create({ collection: 'people', data: { name: 'Gerbert', kind: 'person' } })
      await payload.create({ collection: 'people', data: { name: 'Gerberge', kind: 'person' } })
      await payload.create({
        collection: 'people',
        data: { name: 'Gerold', kind: 'person', wikidata: '' },
      })
      const saved = await payload.create({
        collection: 'people',
        data: { name: 'Gerlinde', kind: 'person', wikidata: '' },
      })
      expect(saved.wikidata ?? null).toBeNull()
    })
  })

  describe('managed errors', () => {
    // The dev, 2026-11-16: the sources are facultative — a link may be entered first, sourced later
    it('accepts a link with no source line', async () => {
      const bare = await link({ vassal: count, suzerain: duke, date: years(1090, 1090), lines: [] })
      expect(bare.lines ?? []).toEqual([])
      await payload.delete({ collection: 'vassal-links', id: bare.id })
    })

    it('refuses a title that answers to itself', async () => {
      await expect(
        link({ vassal: count, suzerain: count, date: years(1100, 1100), lines: [{ source }] })
      ).rejects.toThrow('Suzerain')
    })

    it('refuses a link answering to a title with no title chosen — never read as a sovereign', async () => {
      await expect(
        link({ vassal: count, answersTo: 'suzerain', date: years(1100, 1100), lines: [{ source }] })
      ).rejects.toThrow('Suzerain')
    })

    it('refuses to delete a title a link names, naming the links', async () => {
      await expect(payload.delete({ collection: 'titles', id: duke })).rejects.toThrow(
        'Ce titre est cité par 2 maillon(s)'
      )
      expect((await payload.findByID({ collection: 'titles', id: duke })).id).toBe(duke)
    })

    it('refuses to delete a title a city sheet names as its holder, naming the sheet', async () => {
      const lone = (
        await title('Hoël', { name: 'comté de Cornouaille', kind: 'county' }, 1066, 1084)
      ).title
      const place = await payload.create({
        collection: 'places',
        data: { name: 'Quimper', location: [-4.1, 48.0] },
      })
      await payload.create({
        collection: 'place-periods',
        data: {
          place: place.id,
          date: { start: { year: 1080 } },
          importance: 'city',
          holderTitle: lone,
          testimonies: [{ source, subject: 'importance', importance: 'city' }],
        },
      })
      await expect(payload.delete({ collection: 'titles', id: lone })).rejects.toThrow(
        'Ce titre est cité par 1 fiche(s) de ville : « Quimper — 1080 »'
      )
    }, 60_000)

    // The dev, 2026-11-15: « il faut plus jamais qu'il y ait de doublons » — Humbert II was entered twice by a correction.
    it('refuses a second person with a Wikidata id another holds, at a creation and at a correction', async () => {
      await payload.create({
        collection: 'people',
        data: { name: 'Humbert II de Savoie', kind: 'person', wikidata: 'Q553289' },
      })
      await expect(
        payload.create({
          collection: 'people',
          data: { name: 'Humbert II', kind: 'person', wikidata: 'Q553289' },
        })
      ).rejects.toThrow('wikidata')
      const other = await payload.create({
        collection: 'people',
        data: { name: 'Humbert de Maurienne', kind: 'person' },
      })
      await expect(
        payload.update({ collection: 'people', id: other.id, data: { wikidata: 'Q553289' } })
      ).rejects.toThrow('wikidata')
    })

    it('refuses a second place with a Wikidata id another holds', async () => {
      await payload.create({
        collection: 'places',
        data: { name: 'Erfurt', location: [11.03, 50.98], wikidata: 'Q1729' },
      })
      await expect(
        payload.create({
          collection: 'places',
          data: { name: 'Erfurt (bis)', location: [11.03, 50.98], wikidata: 'Q1729' },
        })
      ).rejects.toThrow('wikidata')
    })

    it('refuses a second territory with a Wikidata id another holds', async () => {
      await payload.create({
        collection: 'territories',
        data: { name: 'duché d’Apulie et de Calabre', kind: 'duchy', wikidata: 'Q3715874' },
      })
      await expect(
        payload.create({
          collection: 'territories',
          data: { name: 'Apulie', kind: 'duchy', wikidata: 'Q3715874' },
        })
      ).rejects.toThrow('wikidata')
    })

    // The dev, 2026-11-15: three titles entered twice — a claim is itself by its relations and its years.
    it('refuses a second title of the same person, territory and years, naming the first', async () => {
      const first = await payload.findByID({ collection: 'titles', id: count, depth: 0 })
      await expect(
        payload.create({
          collection: 'titles',
          data: {
            person: first.person,
            territory: first.territory,
            date: years(1084, 1103),
            lines: [{ source }],
          },
        })
      ).rejects.toThrow(new RegExp(`^Ce titre existe déjà : « .+ » \\(n° ${String(count)}\\)`))
    })

    it('counts two titles with no end as the same years, which an index would not', async () => {
      const holder = await payload.create({
        collection: 'people',
        data: { name: 'Hoël II', kind: 'person' },
      })
      const land = await payload.create({
        collection: 'territories',
        data: { name: 'comté de Cornouaille (bis)', kind: 'county' },
      })
      const data = {
        person: holder.id,
        territory: land.id,
        date: { start: { year: 1100 } },
        lines: [{ source }],
      }
      await payload.create({ collection: 'titles', data })
      await expect(payload.create({ collection: 'titles', data })).rejects.toThrow(
        'Ce titre existe déjà'
      )
    })

    it('refuses a second link of the same vassal to the same suzerain over the same years', async () => {
      await expect(
        link({
          vassal: count,
          answersTo: 'suzerain',
          suzerain: duke,
          date: years(1084, 1103),
          lines: [{ source }],
        })
      ).rejects.toThrow('Ce maillon existe déjà')
      await expect(
        link({ vassal: king, answersTo: 'no-one', date: years(1060, 1108), lines: [{ source }] })
      ).rejects.toThrow('Ce maillon existe déjà')
    })

    it('refuses a correction that makes a title the twin of another, and lets a link be saved again', async () => {
      const holder = await payload.create({
        collection: 'people',
        data: { name: 'Budic', kind: 'person' },
      })
      const land = await payload.create({
        collection: 'territories',
        data: { name: 'comté de Vannes', kind: 'county' },
      })
      const one = { person: holder.id, territory: land.id, lines: [{ source }] }
      const kept = await payload.create({
        collection: 'titles',
        data: { ...one, date: { start: { year: 1100 } } },
      })
      const moved = await payload.create({
        collection: 'titles',
        data: { ...one, date: { start: { year: 1101 } } },
      })
      await expect(
        payload.update({
          collection: 'titles',
          id: moved.id,
          data: { date: { start: { year: 1100 } } },
        })
      ).rejects.toThrow(`(n° ${String(kept.id)})`)
      const { docs } = await payload.find({ collection: 'vassal-links', limit: 1, depth: 0 })
      const anyLink = docs[0]
      if (anyLink === undefined) throw new Error('the fixture holds no link')
      await expect(
        payload.update({ collection: 'vassal-links', id: anyLink.id, data: {} })
      ).resolves.toMatchObject({ id: anyLink.id })
    })

    it('refuses a second « no one » link sent with a stray suzerain, compared as stored', async () => {
      await expect(
        link({
          vassal: king,
          answersTo: 'no-one',
          suzerain: duke,
          date: years(1060, 1108),
          lines: [{ source }],
        })
      ).rejects.toThrow('Ce maillon existe déjà')
    })

    it('refuses to delete a person or a territory a title names, naming the title', async () => {
      const ofCount = await payload.findByID({ collection: 'titles', id: count, depth: 0 })
      await expect(
        payload.delete({ collection: 'people', id: ofCount.person as number })
      ).rejects.toThrow('Cette personne est citée par 1 titre(s)')
      await expect(payload.delete({ collection: 'territories', id: nantes })).rejects.toThrow(
        'Ce territoire est cité par 1 titre(s)'
      )
    })
  })

  // CMS-454, the dev, 2026-11-18: the historian undoes its own errors over MCP — « je n'efface plus tes erreurs ». A
  // deletion goes through these hooks whoever asks for it.
  describe('undoing an entry: a sheet, its place, its source', () => {
    it('refuses to delete a place a city sheet stands on, naming the sheet', async () => {
      const { place } = await entered('Ohligs')
      await expect(payload.delete({ collection: 'places', id: place })).rejects.toThrow(
        'Ce lieu est cité par 1 fiche(s) de ville : « Ohligs — 1100 »'
      )
      expect((await payload.findByID({ collection: 'places', id: place })).id).toBe(place)
    }, 60_000)

    it('refuses to delete a source a city sheet’s line cites, naming the sheet', async () => {
      const { own } = await entered('Barl')
      await expect(payload.delete({ collection: 'sources', id: own })).rejects.toThrow(
        'Cette source est citée par 1 fiche(s) de ville : « Barl — 1100 »'
      )
    }, 60_000)

    it('refuses to delete a source a title’s or a link’s line cites', async () => {
      // The suite's one source is cited by its three titles and its links.
      await expect(payload.delete({ collection: 'sources', id: source })).rejects.toThrow(
        'Cette source est citée par'
      )
      expect((await payload.findByID({ collection: 'sources', id: source })).id).toBe(source)
    })

    it('undoes an entry from the sheet down: the sheet, then its place, then its source', async () => {
      const { place, own, sheet } = await entered('Solingen')
      await payload.delete({ collection: 'place-periods', id: sheet })
      await payload.delete({ collection: 'places', id: place })
      await payload.delete({ collection: 'sources', id: own })
      const left = await Promise.all([
        payload.find({ collection: 'place-periods', where: { id: { equals: sheet } } }),
        payload.find({ collection: 'places', where: { id: { equals: place } } }),
        payload.find({ collection: 'sources', where: { id: { equals: own } } }),
      ])
      expect(left.map(({ totalDocs }) => totalDocs)).toEqual([0, 0, 0])
    }, 60_000)

    it('keeps a source two sheets cite when one of them is deleted, and still refuses its deletion', async () => {
      const first = await entered('Wald')
      const second = await payload.create({
        collection: 'places',
        data: { name: 'Gräfrath', location: [7.07, 51.21] },
      })
      await payload.create({
        collection: 'place-periods',
        data: {
          place: second.id,
          date: { start: { year: 1100 } },
          importance: 'city',
          testimonies: [{ source: first.own, subject: 'importance', importance: 'city' }],
        },
      })
      await payload.delete({ collection: 'place-periods', id: first.sheet })
      await expect(payload.delete({ collection: 'sources', id: first.own })).rejects.toThrow(
        '« Gräfrath — 1100 »'
      )
    }, 60_000)
  })

  // L4: N/A — a failing database is Payload's, inside its transaction; the hooks add no I/O of their own past it.
  // L5: a link whose suzerain is gone is `vassalLinkOf`'s edge (vassalLinkOf.test.ts) — the delete above refuses it.
})
