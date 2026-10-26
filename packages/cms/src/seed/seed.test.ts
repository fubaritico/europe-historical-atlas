import { describe, expect, it, vi } from 'vitest'

import { eventMoment, existenceMoment, seed } from './seed'
import { ACTORS, EVENTS, PLACES, SOURCES, TYPES } from './year1100'

import type { ReadWikidataPlace, SeedCollection, SeedData, SeedStore } from './seed'
import type { WikidataPlace } from '../wikidata/wikidataPlace'

/** A base in memory: records per collection, ids counted from 1. */
function memoryStore() {
  const records = new Map<SeedCollection, { id: number; data: Record<string, unknown> }[]>()
  let next = 1
  const store: SeedStore = {
    findId(collection, field, value) {
      const found = (records.get(collection) ?? []).find((record) => record.data[field] === value)
      return Promise.resolve(found?.id ?? null)
    },
    create(collection, data) {
      const id = next++
      records.set(collection, [...(records.get(collection) ?? []), { id, data }])
      return Promise.resolve(id)
    },
    readField(collection, id, field) {
      const found = (records.get(collection) ?? []).find((record) => record.id === id)
      return Promise.resolve(found?.data[field])
    },
    update(collection, id, data) {
      const found = (records.get(collection) ?? []).find((record) => record.id === id)
      if (found === undefined) return Promise.reject(new Error(`no ${collection} ${String(id)}`))
      found.data = { ...found.data, ...data }
      return Promise.resolve()
    },
  }
  return { store, records: (collection: SeedCollection) => records.get(collection) ?? [] }
}

/** Wikidata answering every place at the same point. */
const atParis: ReadWikidataPlace = (id) =>
  Promise.resolve({
    wikidata: id,
    name: null,
    coordinates: { lon: 2.35, lat: 48.86 },
    existsFrom: null,
    existsTo: null,
  })

/** The real data of 1100. */
const YEAR_1100: SeedData = {
  types: TYPES,
  sources: SOURCES,
  actors: ACTORS,
  places: PLACES,
  events: EVENTS,
}

/** One event at one place, with one actor, one source and one type. */
const SMALL: SeedData = {
  types: [{ name: 'Bataille', icon: 'swords' }],
  sources: [
    {
      title: 'Gesta',
      author: 'Anonyme',
      publisher: 'X',
      editionYear: 1900,
      kind: 'primary',
      url: 'https://example.org/gesta',
    },
  ],
  actors: [{ wikidata: 'Q1', name: 'Tancrède', kind: 'person' }],
  places: [{ wikidata: 'Q41621', name: 'Haïfa' }],
  events: [
    {
      title: 'Prise de Haïfa',
      type: 'Bataille',
      date: { year: 1100, month: 8 },
      place: 'Q41621',
      actors: ['Q1'],
      sources: ['Gesta'],
      description: 'Tancrède prend Haïfa.',
      wikidata: 'Q137785638',
    },
  ],
}

const nowhere: ReadWikidataPlace = (id) =>
  atParis(id).then((place): WikidataPlace => ({ ...place, coordinates: null }))

const unreachable: ReadWikidataPlace = () => Promise.reject(new Error('offline'))

describe('seed', () => {
  describe('happy path', () => {
    it('creates every record of 1100 in an empty base', async () => {
      const base = memoryStore()

      const report = await seed(base.store, atParis, YEAR_1100)

      expect(report.events).toEqual({ found: 0, created: EVENTS.length, updated: 0 })
      expect(report.places).toEqual({ found: 0, created: PLACES.length, updated: 0 })
      expect(report.actors).toEqual({ found: 0, created: ACTORS.length, updated: 0 })
      expect(report.sources).toEqual({ found: 0, created: SOURCES.length, updated: 0 })
      expect(report['event-types']).toEqual({ found: 0, created: TYPES.length, updated: 0 })
    })

    it('links an event to the ids of its type, place, actors and sources', async () => {
      const base = memoryStore()

      await seed(base.store, atParis, SMALL)

      const [event] = base.records('events')
      expect(event?.data).toMatchObject({
        type: base.records('event-types')[0]?.id,
        place: base.records('places')[0]?.id,
        actors: [base.records('actors')[0]?.id],
        sources: [base.records('sources')[0]?.id],
      })
    })

    it('passes an event’s Wikidata id and a source’s address through', async () => {
      const base = memoryStore()

      await seed(base.store, atParis, SMALL)

      expect(base.records('events')[0]?.data.wikidata).toBe('Q137785638')
      expect(base.records('sources')[0]?.data.url).toBe('https://example.org/gesta')
    })

    it('writes a place at the position Wikidata gives, as [lon, lat]', async () => {
      const base = memoryStore()

      await seed(base.store, atParis, SMALL)

      expect(base.records('places')[0]?.data).toMatchObject({
        name: 'Haïfa',
        wikidata: 'Q41621',
        location: [2.35, 48.86],
      })
    })
  })

  describe('variants', () => {
    it('reuses a record already in the base and leaves it unchanged', async () => {
      const base = memoryStore()
      const theirs = await base.store.create('actors', {
        wikidata: 'Q1',
        name: 'Tancrède (le sien)',
      })

      const report = await seed(base.store, atParis, SMALL)

      expect(report.actors).toEqual({ found: 1, created: 0, updated: 0 })
      expect(base.records('actors')).toEqual([
        { id: theirs, data: { wikidata: 'Q1', name: 'Tancrède (le sien)' } },
      ])
      expect(base.records('events')[0]?.data.actors).toEqual([theirs])
    })

    it('creates nothing on a second run', async () => {
      const base = memoryStore()
      await seed(base.store, atParis, YEAR_1100)

      const report = await seed(base.store, atParis, YEAR_1100)

      for (const count of Object.values(report)) expect(count.created).toBe(0)
    })

    it('gives a type the dev wrote its icon while it still holds the default pin', async () => {
      const base = memoryStore()
      const theirs = await base.store.create('event-types', { name: 'Bataille', icon: 'pin' })

      const report = await seed(base.store, atParis, SMALL)

      expect(base.records('event-types')).toEqual([
        { id: theirs, data: { name: 'Bataille', icon: 'swords' } },
      ])
      expect(report['event-types']).toEqual({ found: 1, created: 0, updated: 1 })
    })

    it('never replaces an icon the dev chose', async () => {
      const base = memoryStore()
      await base.store.create('event-types', { name: 'Bataille', icon: 'tower' })

      await seed(base.store, atParis, SMALL)

      expect(base.records('event-types')[0]?.data.icon).toBe('tower')
    })

    it('does not ask Wikidata for a place already in the base', async () => {
      const base = memoryStore()
      await base.store.create('places', { wikidata: 'Q41621' })
      const readPlace = vi.fn(atParis)

      await seed(base.store, readPlace, SMALL)

      expect(readPlace).not.toHaveBeenCalled()
    })

    it('writes an event without a place when it has none', async () => {
      const base = memoryStore()
      const [event] = SMALL.events
      if (event === undefined) throw new Error('fixture')
      const { place: _place, ...placeless } = event

      await seed(base.store, atParis, { ...SMALL, events: [placeless] })

      expect(base.records('events')[0]?.data).not.toHaveProperty('place')
    })
  })

  describe('managed errors', () => {
    it('refuses a place Wikidata gives no position, before writing anything', async () => {
      const base = memoryStore()
      await expect(seed(base.store, nowhere, SMALL)).rejects.toThrow(
        'Wikidata gives Q41621 (Haïfa) no position'
      )
      expect(base.records('event-types')).toEqual([])
    })

    it('refuses an event naming a type the data does not declare', async () => {
      const base = memoryStore()
      const [event] = SMALL.events
      if (event === undefined) throw new Error('fixture')

      await expect(
        seed(base.store, atParis, { ...SMALL, events: [{ ...event, type: 'Siège' }] })
      ).rejects.toThrow('type « Siège » is not declared')
    })
  })

  describe('unmanaged errors', () => {
    it('stops before writing anything when Wikidata cannot be reached', async () => {
      const base = memoryStore()
      await expect(seed(base.store, unreachable, SMALL)).rejects.toThrow('offline')
      expect(base.records('event-types')).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('gives a day its Julian calendar, and none to a month alone', () => {
      expect(eventMoment({ year: 1100, month: 9, day: 16 })).toEqual({
        year: 1100,
        month: 9,
        day: 16,
        circa: false,
        margin: null,
        calendar: 'julian',
      })
      expect(eventMoment({ year: 1100, month: 8 }).calendar).toBeNull()
    })

    it('keeps the circa and the margin Wikidata gave a place', () => {
      expect(
        existenceMoment({
          year: -250,
          month: null,
          day: null,
          calendar: null,
          circa: true,
          margin: 50,
        })
      ).toMatchObject({ year: -250, circa: true, margin: 50 })
    })

    it('leaves out an end of existence Wikidata did not give, rather than writing null', async () => {
      const base = memoryStore()

      await seed(base.store, atParis, SMALL)

      const place = base.records('places')[0]?.data
      expect(place).not.toHaveProperty('existsFrom')
      expect(place).not.toHaveProperty('existsTo')
    })

    it('every reference in the data of 1100 is declared', async () => {
      const base = memoryStore()

      await expect(seed(base.store, atParis, YEAR_1100)).resolves.toBeDefined()
    })
  })
})
