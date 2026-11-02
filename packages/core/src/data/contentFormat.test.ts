import { describe, expect, it } from 'vitest'

import { CONTENT_FORMAT_VERSION, contentFileSchema } from './contentFormat'

import type { ContentEvent } from './contentFormat'

/**
 * The capture of Jerusalem, as the export writes it.
 * @param overrides - what a test changes
 * @returns the event
 */
function capture(overrides: Partial<Record<keyof ContentEvent, unknown>> = {}): unknown {
  return {
    id: '10',
    title: { fr: 'Prise de Jérusalem', en: null },
    type: { id: '1', name: { fr: 'Siège', en: 'Siege' }, icon: 'tower', colour: '#ff7a00' },
    date: {
      kind: 'instant',
      at: { year: 1099, month: null, day: null, calendar: null, circa: false, margin: null },
    },
    place: {
      id: '2',
      name: { fr: 'Jérusalem', en: null },
      lon: 35.21,
      lat: 31.77,
      wikidata: 'Q1218',
      existsFrom: null,
      existsTo: null,
    },
    actors: [{ id: '3', name: { fr: 'Godefroy', en: null }, kind: 'person', wikidata: null }],
    description: null,
    sources: [{ id: '4', title: 'Gesta Francorum', author: null, url: null }],
    wikidata: null,
    engine: 'traction-trebuchet',
    ...overrides,
  }
}

/**
 * Parse a file holding one event.
 * @param event - the event
 * @returns whether the schema accepts it
 */
function accepts(event: unknown): boolean {
  return contentFileSchema.safeParse({
    version: CONTENT_FORMAT_VERSION,
    events: [event],
    cities: [],
  }).success
}

/**
 * Rome in 1100, as the export writes it: its place written in, a reason named, a source's line.
 * @param overrides - what a test changes
 * @returns the city
 */
function rome(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: '1',
    place: {
      id: '5',
      name: { fr: 'Rome', en: 'Rome' },
      lon: 12.48,
      lat: 41.89,
      wikidata: 'Q220',
      existsFrom: null,
      existsTo: null,
    },
    date: {
      kind: 'instant',
      at: { year: 1100, month: null, day: null, calendar: null, circa: true, margin: null },
    },
    importance: 'capital',
    reasons: [{ fr: 'Évêché', en: null }],
    testimonies: [
      {
        source: { id: '4', title: 'Buringh 2021', author: 'Eltjo Buringh', url: null },
        where: 'p. 12',
        quotation: null,
        subject: 'population',
        population: 35000,
      },
    ],
    holder: { name: 'Papal States', wikidata: 'Q170174' },
    ...overrides,
  }
}

/**
 * Parse a file holding one city and no event.
 * @param city - the city
 * @returns whether the schema accepts it
 */
function acceptsCity(city: unknown): boolean {
  return contentFileSchema.safeParse({
    version: CONTENT_FORMAT_VERSION,
    events: [],
    cities: [city],
  }).success
}

describe('contentFileSchema — the cities at a date', () => {
  describe('happy path', () => {
    it('accepts Rome in 1100, its place written in, a reason named, a source’s line', () => {
      expect(acceptsCity(rome())).toBe(true)
    })
  })

  describe('variants', () => {
    it('accepts a line about the importance and one about a named reason', () => {
      const source = { id: '4', title: 'Buringh 2021', author: null, url: null }
      const lines = [
        { source, where: null, quotation: null, subject: 'importance', importance: 'large-city' },
        {
          source,
          where: null,
          quotation: null,
          subject: 'reason',
          reason: { fr: 'Pèlerinage', en: 'Pilgrimage' },
        },
      ]
      expect(acceptsCity(rome({ testimonies: lines }))).toBe(true)
    })

    it('accepts a city with no reason, no line and no holder', () => {
      expect(acceptsCity(rome({ reasons: [], testimonies: [], holder: null }))).toBe(true)
    })

    it('accepts a line about the holder, quoted, and a holder with no Wikidata id', () => {
      const source = {
        id: '7',
        title: 'The History of Iceland',
        author: 'Gunnar Karlsson',
        url: null,
      }
      const line = {
        source,
        where: 'p. 82–83',
        quotation: 'By 1264, all Icelandic chieftains had sworn allegiance to the King of Norway',
        subject: 'holder',
        holder: { name: 'Icelandic Commonwealth', wikidata: 'Q62389' },
      }
      const city = rome({
        testimonies: [line],
        holder: { name: 'Norse Greenland', wikidata: null },
      })
      expect(acceptsCity(city)).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('refuses an importance the map does not have', () => {
      expect(acceptsCity(rome({ importance: 'village' }))).toBe(false)
    })

    it('refuses a city written without its holder, as a file of version 5 was', () => {
      const { holder: _dropped, ...older } = rome() as Record<string, unknown>
      expect(acceptsCity(older)).toBe(false)
    })

    it('refuses a holder whose Wikidata id is not one', () => {
      expect(acceptsCity(rome({ holder: { name: 'Venice', wikidata: 'Venice' } }))).toBe(false)
    })

    it('refuses a line about the population without its figure', () => {
      const source = { id: '4', title: 'Buringh 2021', author: null, url: null }
      expect(
        acceptsCity(rome({ testimonies: [{ source, where: null, subject: 'population' }] }))
      ).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a city whose place is only an id — the export joins it, the atlas never does', () => {
      expect(acceptsCity(rome({ place: '5' }))).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('refuses a file of the format before the cities: it has no list of them', () => {
      expect(
        contentFileSchema.safeParse({ version: CONTENT_FORMAT_VERSION, events: [] }).success
      ).toBe(false)
    })
  })
})

describe('contentFileSchema', () => {
  describe('happy path', () => {
    it('accepts an event with its place, actors and sources', () => {
      expect(accepts(capture())).toBe(true)
    })
  })

  describe('variants', () => {
    it('accepts an event with no place', () => {
      expect(accepts(capture({ place: null }))).toBe(true)
    })

    it('accepts an event with no engin — a battle, or a siege no period covers', () => {
      expect(accepts(capture({ engine: null }))).toBe(true)
    })

    it('accepts an interval date', () => {
      const moment = {
        year: 1096,
        month: null,
        day: null,
        calendar: null,
        circa: false,
        margin: null,
      }
      expect(
        accepts(
          capture({ date: { kind: 'interval', from: moment, to: { ...moment, year: 1099 } } })
        )
      ).toBe(true)
    })

    it('accepts a source with an address', () => {
      expect(
        accepts(
          capture({ sources: [{ id: '4', title: 'T', author: 'A', url: 'https://archive.org/x' }] })
        )
      ).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('refuses the year 0', () => {
      const date = {
        kind: 'instant',
        at: { year: 0, month: null, day: null, calendar: null, circa: false, margin: null },
      }
      expect(accepts(capture({ date }))).toBe(false)
    })

    it('refuses a title with no French', () => {
      expect(accepts(capture({ title: { fr: '', en: 'Capture' } }))).toBe(false)
    })

    it('refuses a place whose beginning has a margin but no circa', () => {
      const existsFrom = {
        year: 1000,
        month: null,
        day: null,
        calendar: null,
        circa: false,
        margin: 5,
      }
      const place = {
        id: '2',
        name: { fr: 'X', en: null },
        lon: 0,
        lat: 0,
        wikidata: null,
        existsFrom,
        existsTo: null,
      }
      expect(accepts(capture({ place }))).toBe(false)
    })

    it('refuses an unknown version, the earlier ones included', () => {
      for (const version of [1, 2, 3, 4, 5, 7])
        expect(contentFileSchema.safeParse({ version, events: [], cities: [] }).success).toBe(false)
    })

    it('refuses an engin it does not know — the catapult among them', () => {
      expect(accepts(capture({ engine: 'catapult' }))).toBe(false)
    })

    it('refuses an event with no engine key, the version 2 shape', () => {
      const { engine: _engine, ...withoutEngine } = capture() as Record<string, unknown>
      expect(accepts(withoutEngine)).toBe(false)
    })

    it('refuses an event type with an icon it does not know', () => {
      const type = { id: '1', name: { fr: 'Siège', en: null }, icon: 'catapult', colour: '#ff7a00' }
      expect(accepts(capture({ type }))).toBe(false)
    })

    it('refuses an event type with no colour, the version 3 shape', () => {
      const type = { id: '1', name: { fr: 'Siège', en: null }, icon: 'tower' }
      expect(accepts(capture({ type }))).toBe(false)
    })

    it('refuses an event type whose colour is not a #rrggbb colour', () => {
      for (const colour of ['red', '#e31', '#E3170A', 'e3170a'])
        expect(
          accepts(
            capture({ type: { id: '1', name: { fr: 'Siège', en: null }, icon: 'tower', colour } })
          )
        ).toBe(false)
    })

    it('refuses an event type with no icon', () => {
      const type = { id: '1', name: { fr: 'Siège', en: null }, colour: '#ff7a00' }
      expect(accepts(capture({ type }))).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses an unknown key', () => {
      expect(accepts({ ...(capture() as object), colour: '#fff' })).toBe(false)
    })

    it('refuses a malformed Wikidata id', () => {
      expect(accepts(capture({ wikidata: 'Jerusalem' }))).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('refuses a latitude past the pole', () => {
      const place = {
        id: '2',
        name: { fr: 'X', en: null },
        lon: 0,
        lat: 91,
        wikidata: null,
        existsFrom: null,
        existsTo: null,
      }
      expect(accepts(capture({ place }))).toBe(false)
    })

    it('refuses an actor that is neither a person nor a house', () => {
      expect(
        accepts(
          capture({
            actors: [{ id: '3', name: { fr: 'X', en: null }, kind: 'tribe', wikidata: null }],
          })
        )
      ).toBe(false)
    })

    it('says why a refused date is refused', () => {
      const date = {
        kind: 'interval',
        from: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
        to: { year: 1090, month: null, day: null, calendar: null, circa: false, margin: null },
      }
      const result = contentFileSchema.safeParse({
        version: CONTENT_FORMAT_VERSION,
        events: [capture({ date })],
        cities: [],
      })
      expect(result.error?.issues[0]?.message).toBe('the interval ends before it begins')
    })
  })
})
