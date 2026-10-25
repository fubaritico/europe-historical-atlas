import { describe, expect, it } from 'vitest'

import { contentFileSchema } from './contentFormat'

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
    type: { id: '1', name: { fr: 'Siège', en: 'Siege' } },
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
    ...overrides,
  }
}

/**
 * Parse a file holding one event.
 * @param event - the event
 * @returns whether the schema accepts it
 */
function accepts(event: unknown): boolean {
  return contentFileSchema.safeParse({ version: 1, events: [event] }).success
}

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

    it('refuses an unknown version', () => {
      expect(contentFileSchema.safeParse({ version: 2, events: [] }).success).toBe(false)
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
      const result = contentFileSchema.safeParse({ version: 1, events: [capture({ date })] })
      expect(result.error?.issues[0]?.message).toBe('the interval ends before it begins')
    })
  })
})
