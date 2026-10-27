import { describe, expect, it, vi } from 'vitest'

import {
  CONTENT_FORMAT_VERSION,
  contentFileSchema,
} from '@europe-historical-atlas/core/data/contentFormat'

import { toContent, toContentEvent, toSiegeEnginePeriods } from './toContent'

import type { DocEvent, DocSiegeEngine, ExportContext } from './toContent'
import type { ContentEvent } from '@europe-historical-atlas/core/data/contentFormat'

const SIEGE = { id: 1, name: { fr: 'Siège', en: 'Siege' }, icon: 'tower' as const }
const JERUSALEM = {
  id: 2,
  name: { fr: 'Jérusalem', en: 'Jerusalem' },
  location: [35.2137, 31.7683] as [number, number],
  wikidata: 'Q1218',
}
const GODFREY = { id: 3, name: { fr: 'Godefroy de Bouillon', en: null }, kind: 'person' as const }
const GESTA = { id: 4, title: 'Gesta Francorum', author: null, url: '' }

/** The traction trebuchet from 808, still in use: the one engin of a siege of 1099. */
const TRACTION: DocSiegeEngine = {
  id: 5,
  engine: 'traction-trebuchet',
  inUse: { start: { year: 808, circa: true } },
}

/** An export that knows the traction trebuchet and has nothing to say. */
const QUIET: ExportContext = { periods: toSiegeEnginePeriods([TRACTION]), warn: () => undefined }

/**
 * One event exported with {@link QUIET}.
 * @param event - the record
 * @returns it, as the atlas reads it
 */
function exportEvent(event: DocEvent): ContentEvent {
  return toContentEvent(event, QUIET)
}

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
      expect(exportEvent(capture())).toEqual({
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
        engine: 'traction-trebuchet',
      })
    })

    it('writes a file core’s schema accepts', () => {
      expect(contentFileSchema.safeParse(toContent([capture()], QUIET)).success).toBe(true)
    })
  })

  describe('variants', () => {
    it('writes no place as null', () => {
      expect(exportEvent(capture({ place: null })).place).toBeNull()
    })

    it('writes an event with no actor and no source', () => {
      const event = exportEvent(capture({ actors: null, sources: null }))
      expect([event.actors, event.sources]).toEqual([[], []])
    })

    it('writes no description as null', () => {
      expect(exportEvent(capture({ description: { fr: '', en: null } })).description).toBeNull()
    })

    it('writes an empty file for no events', () => {
      expect(toContent([], QUIET)).toEqual({ version: CONTENT_FORMAT_VERSION, events: [] })
    })
  })

  describe('managed errors', () => {
    it('refuses a refused date, naming the event', () => {
      expect(() => exportEvent(capture({ date: { start: { year: 0 } } }))).toThrow(
        '[CMS] event 10: L’an 0 n’existe pas'
      )
    })

    it('refuses an event whose type has no icon, rather than drawing it as a pin', () => {
      expect(() =>
        exportEvent(capture({ type: { id: 1, name: { fr: 'Siège', en: null } } }))
      ).toThrow('event 10, type: no icon')
    })

    it('refuses an event with no French title', () => {
      expect(() => exportEvent(capture({ title: { en: 'Capture' } }))).toThrow(
        'event 10: no French text'
      )
    })

    it('writes a place’s existence', () => {
      const place = { ...JERUSALEM, existsFrom: { year: -3000, circa: true, margin: 500 } }
      expect(exportEvent(capture({ place })).place?.existsFrom).toMatchObject({
        year: -3000,
        margin: 500,
      })
    })

    it('refuses a place that ends before it begins', () => {
      const place = { ...JERUSALEM, existsFrom: { year: 1100 }, existsTo: { year: 1000 } }
      expect(() => exportEvent(capture({ place }))).toThrow('place 2: La fin vient avant le début.')
    })

    it('refuses a place with no position', () => {
      expect(() => exportEvent(capture({ place: { ...JERUSALEM, location: null } }))).toThrow(
        'place 2: no position'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a relation left as a bare id', () => {
      expect(() => exportEvent(capture({ sources: [4] }))).toThrow(
        'event 10, source: not resolved (4)'
      )
    })

    it('refuses an event with no type', () => {
      expect(() => exportEvent(capture({ type: null }))).toThrow('event 10: no type')
    })
  })

  describe('edge cases', () => {
    it('reads a blank English text as missing', () => {
      expect(exportEvent(capture({ title: { fr: 'Prise', en: '  ' } })).title.en).toBeNull()
    })

    it('refuses a description written only in English', () => {
      expect(() =>
        exportEvent(capture({ description: { fr: null, en: 'The city falls.' } }))
      ).toThrow('description: no French text')
    })
  })

  describe('siege engins', () => {
    it('gives a siege the newest engin in use at its date', () => {
      const counterweight: DocSiegeEngine = {
        id: 6,
        engine: 'counterweight-trebuchet',
        inUse: { start: { year: 1217 }, end: { year: 1450 } },
      }
      const context = { periods: toSiegeEnginePeriods([TRACTION, counterweight]), warn: vi.fn() }
      const siege = capture({ date: { start: { year: 1250 } } })
      expect(toContentEvent(siege, context).engine).toBe('counterweight-trebuchet')
      expect(context.warn).not.toHaveBeenCalled()
    })

    it('gives a battle no engin, and says nothing, even with no period at all', () => {
      const context = { periods: [], warn: vi.fn() }
      const battle = capture({
        type: { id: 7, name: { fr: 'Bataille', en: null }, icon: 'swords' },
      })
      expect(toContentEvent(battle, context).engine).toBeNull()
      expect(context.warn).not.toHaveBeenCalled()
    })

    it('says so, naming the siege and its date, when no period covers it — the map shows the tower alone', () => {
      const context = { periods: [], warn: vi.fn() }
      expect(toContentEvent(capture(), context).engine).toBeNull()
      expect(context.warn).toHaveBeenCalledOnce()
      expect(context.warn).toHaveBeenCalledWith(
        expect.stringMatching(/event 10: .*1099.*tower alone/)
      )
    })

    it('reads a period with no end as still in use, and one with an end as an interval', () => {
      const [open, closed] = toSiegeEnginePeriods([
        TRACTION,
        { id: 6, engine: 'cannon', inUse: { start: { year: 1326 }, end: { year: 1900 } } },
      ])
      expect([open?.inUse.kind, closed?.inUse.kind]).toEqual(['instant', 'interval'])
    })

    it('stops the export on a period that is no date, naming the engin', () => {
      const broken: DocSiegeEngine = { id: 9, engine: 'cannon', inUse: { start: { year: 0 } } }
      expect(() => toSiegeEnginePeriods([broken])).toThrow('siege engine 9')
    })
  })
})
