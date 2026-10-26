import { describe, expect, it } from 'vitest'

import { contentFileSchema } from '@europe-historical-atlas/core/data/contentFormat'

import { toContent, toContentEvent } from './toContent'

import type { DocEvent } from './toContent'

const SIEGE = { id: 1, name: { fr: 'Siège', en: 'Siege' }, icon: 'tower' as const }
const JERUSALEM = {
  id: 2,
  name: { fr: 'Jérusalem', en: 'Jerusalem' },
  location: [35.2137, 31.7683] as [number, number],
  wikidata: 'Q1218',
}
const GODFREY = { id: 3, name: { fr: 'Godefroy de Bouillon', en: null }, kind: 'person' as const }
const GESTA = { id: 4, title: 'Gesta Francorum', author: null, url: '' }

/**
 * The capture of Jerusalem, every relation resolved.
 * @param overrides - what a test changes
 * @returns the event as Payload answers it
 */
function capture(overrides: Partial<DocEvent> = {}): DocEvent {
  return {
    id: 10,
    title: { fr: 'Prise de Jérusalem', en: 'Capture of Jerusalem' },
    type: SIEGE,
    date: { start: { year: 1099, month: 7, day: 15, calendar: 'julian' } },
    place: JERUSALEM,
    actors: [GODFREY],
    description: { fr: 'La ville est prise.', en: null },
    sources: [GESTA],
    wikidata: null,
    ...overrides,
  }
}

describe('toContent', () => {
  describe('happy path', () => {
    it('writes an event with everything it points to', () => {
      expect(toContentEvent(capture())).toEqual({
        id: '10',
        title: { fr: 'Prise de Jérusalem', en: 'Capture of Jerusalem' },
        type: { id: '1', name: { fr: 'Siège', en: 'Siege' }, icon: 'tower' },
        date: {
          kind: 'instant',
          at: { year: 1099, month: 7, day: 15, calendar: 'julian', circa: false, margin: null },
        },
        place: {
          id: '2',
          name: { fr: 'Jérusalem', en: 'Jerusalem' },
          lon: 35.2137,
          lat: 31.7683,
          wikidata: 'Q1218',
          existsFrom: null,
          existsTo: null,
        },
        actors: [
          {
            id: '3',
            name: { fr: 'Godefroy de Bouillon', en: null },
            kind: 'person',
            wikidata: null,
          },
        ],
        description: { fr: 'La ville est prise.', en: null },
        sources: [{ id: '4', title: 'Gesta Francorum', author: null, url: null }],
        wikidata: null,
      })
    })

    it('writes a file core’s schema accepts', () => {
      expect(contentFileSchema.safeParse(toContent([capture()])).success).toBe(true)
    })
  })

  describe('variants', () => {
    it('writes no place as null', () => {
      expect(toContentEvent(capture({ place: null })).place).toBeNull()
    })

    it('writes an event with no actor and no source', () => {
      const event = toContentEvent(capture({ actors: null, sources: null }))
      expect([event.actors, event.sources]).toEqual([[], []])
    })

    it('writes no description as null', () => {
      expect(toContentEvent(capture({ description: { fr: '', en: null } })).description).toBeNull()
    })

    it('writes an empty file for no events', () => {
      expect(toContent([])).toEqual({ version: 2, events: [] })
    })
  })

  describe('managed errors', () => {
    it('refuses a refused date, naming the event', () => {
      expect(() => toContentEvent(capture({ date: { start: { year: 0 } } }))).toThrow(
        '[CMS] event 10: L’an 0 n’existe pas'
      )
    })

    it('refuses an event whose type has no icon, rather than drawing it as a pin', () => {
      expect(() =>
        toContentEvent(capture({ type: { id: 1, name: { fr: 'Siège', en: null } } }))
      ).toThrow('event 10, type: no icon')
    })

    it('refuses an event with no French title', () => {
      expect(() => toContentEvent(capture({ title: { en: 'Capture' } }))).toThrow(
        'event 10: no French text'
      )
    })

    it('writes a place’s existence', () => {
      const place = { ...JERUSALEM, existsFrom: { year: -3000, circa: true, margin: 500 } }
      expect(toContentEvent(capture({ place })).place?.existsFrom).toMatchObject({
        year: -3000,
        margin: 500,
      })
    })

    it('refuses a place that ends before it begins', () => {
      const place = { ...JERUSALEM, existsFrom: { year: 1100 }, existsTo: { year: 1000 } }
      expect(() => toContentEvent(capture({ place }))).toThrow(
        'place 2: La fin vient avant le début.'
      )
    })

    it('refuses a place with no position', () => {
      expect(() => toContentEvent(capture({ place: { ...JERUSALEM, location: null } }))).toThrow(
        'place 2: no position'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a relation left as a bare id', () => {
      expect(() => toContentEvent(capture({ sources: [4] }))).toThrow(
        'event 10, source: not resolved (4)'
      )
    })

    it('refuses an event with no type', () => {
      expect(() => toContentEvent(capture({ type: null }))).toThrow('event 10: no type')
    })
  })

  describe('edge cases', () => {
    it('reads a blank English text as missing', () => {
      expect(toContentEvent(capture({ title: { fr: 'Prise', en: '  ' } })).title.en).toBeNull()
    })

    it('refuses a description written only in English', () => {
      expect(() =>
        toContentEvent(capture({ description: { fr: null, en: 'The city falls.' } }))
      ).toThrow('description: no French text')
    })
  })
})
