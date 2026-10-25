import { describe, expect, it } from 'vitest'

import {
  entityUrl,
  momentFromWikidataTime,
  readPlaceEntity,
  readSearchAnswer,
  searchUrl,
} from './wikidataPlace'

/**
 * An item's JSON, as `Special:EntityData` answers it.
 * @param claims - its P625 statements
 * @param id - its id
 * @returns the JSON
 */
function entity(claims: unknown[] | undefined, id = 'Q90'): unknown {
  return {
    entities: {
      [id]: {
        id,
        labels: { fr: { language: 'fr', value: 'Paris' } },
        ...(claims === undefined ? {} : { claims: { P625: claims } }),
      },
    },
  }
}

/**
 * One coordinate statement.
 * @param rank - its rank
 * @param lat - its latitude
 * @param lon - its longitude
 * @returns the statement
 */
const coordinate = (rank: string, lat: number, lon: number) => ({
  rank,
  mainsnak: { datavalue: { value: { latitude: lat, longitude: lon, altitude: null } } },
})

describe('wikidataPlace', () => {
  describe('happy path', () => {
    it('reads the candidates of a search, in order', () => {
      const answer = {
        search: [
          { id: 'Q90', label: 'Paris', description: 'capitale et ville la plus peuplée de France' },
          {
            id: 'Q830149',
            label: 'Paris',
            description: 'ville du comté de Lamar, Texas, États-Unis',
          },
        ],
      }
      expect(readSearchAnswer(answer).map((candidate) => candidate.id)).toEqual(['Q90', 'Q830149'])
    })

    it('reads an item’s position and French name', () => {
      expect(readPlaceEntity(entity([coordinate('normal', 48.8567, 2.3522)]))).toEqual({
        wikidata: 'Q90',
        name: 'Paris',
        coordinates: { lon: 2.3522, lat: 48.8567 },
        existsFrom: null,
        existsTo: null,
      })
    })
  })

  describe('variants', () => {
    it('asks the search in French, for items, a few at a time', () => {
      const url = new URL(searchUrl('Saint-Denis'))
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        search: 'Saint-Denis',
        language: 'fr',
        type: 'item',
        limit: '7',
      })
    })

    it('prefers the preferred coordinates', () => {
      const place = readPlaceEntity(
        entity([coordinate('normal', 1, 1), coordinate('preferred', 2, 2)])
      )
      expect(place.coordinates).toEqual({ lon: 2, lat: 2 })
    })

    it('reads a candidate with no description as null', () => {
      expect(readSearchAnswer({ search: [{ id: 'Q1', label: 'X' }] })[0]?.description).toBeNull()
    })
  })

  describe('times', () => {
    const GREGORIAN = 'http://www.wikidata.org/entity/Q1985727'
    const JULIAN = 'http://www.wikidata.org/entity/Q1985786'
    const time = (stamp: string, precision: number, calendar = GREGORIAN) => ({
      time: stamp,
      precision,
      calendarmodel: calendar,
    })

    it('reads Paris’s inception, the 3rd century BC, as circa 250 BC ±50', () => {
      expect(momentFromWikidataTime(time('-0300-00-00T00:00:00Z', 7))).toEqual({
        year: -250,
        month: null,
        day: null,
        calendar: null,
        circa: true,
        margin: 50,
      })
    })

    it('reads the 11th century as circa 1050 ±50', () => {
      expect(momentFromWikidataTime(time('+1100-00-00T00:00:00Z', 7))).toMatchObject({
        year: 1050,
        margin: 50,
      })
    })

    it('reads the 1980s as circa 1984 ±5', () => {
      expect(momentFromWikidataTime(time('+1980-00-00T00:00:00Z', 8))).toMatchObject({
        year: 1984,
        margin: 5,
      })
    })

    it('reads a year as exact', () => {
      expect(momentFromWikidataTime(time('+1099-00-00T00:00:00Z', 9))).toMatchObject({
        year: 1099,
        circa: false,
        margin: null,
      })
    })

    it('reads a Julian day with its calendar', () => {
      expect(momentFromWikidataTime(time('+1099-07-15T00:00:00Z', 11, JULIAN))).toMatchObject({
        month: 7,
        day: 15,
        calendar: 'julian',
      })
    })

    it('proposes nothing vaguer than a millennium', () => {
      expect(momentFromWikidataTime(time('-10000-00-00T00:00:00Z', 5))).toBeNull()
    })

    it('reads a value that is not a time as nothing', () => {
      expect(momentFromWikidataTime({ latitude: 1 })).toBeNull()
    })

    it('reads an item’s inception and dissolution', () => {
      const json = {
        entities: {
          Q5690: {
            id: 'Q5690',
            claims: {
              P571: [
                {
                  rank: 'normal',
                  mainsnak: { datavalue: { value: time('-0900-00-00T00:00:00Z', 8) } },
                },
              ],
              P576: [
                {
                  rank: 'normal',
                  mainsnak: { datavalue: { value: time('-0192-01-01T00:00:00Z', 9) } },
                },
              ],
            },
          },
        },
      }
      const place = readPlaceEntity(json)
      expect([place.existsFrom?.year, place.existsTo?.year]).toEqual([-904, -192])
    })
  })

  describe('managed errors', () => {
    it('reads an item with no coordinates as having none', () => {
      expect(readPlaceEntity(entity(undefined)).coordinates).toBeNull()
    })

    it('never takes deprecated coordinates', () => {
      expect(readPlaceEntity(entity([coordinate('deprecated', 1, 1)])).coordinates).toBeNull()
    })

    it('leaves out a candidate with no label', () => {
      expect(readSearchAnswer({ search: [{ id: 'Q1' }] })).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a search answer of another shape', () => {
      expect(() => readSearchAnswer({ error: 'x' })).toThrow()
    })

    it('refuses an answer holding no item', () => {
      expect(() => readPlaceEntity({ entities: {} })).toThrow('no item')
    })
  })

  describe('edge cases', () => {
    it('reads a merged item under its own id', () => {
      expect(readPlaceEntity(entity([], 'Q7')).wikidata).toBe('Q7')
    })

    it('escapes the id in the item’s URL', () => {
      expect(entityUrl('Q90')).toBe('https://www.wikidata.org/wiki/Special:EntityData/Q90.json')
    })

    it('skips a coordinate statement with no value', () => {
      const place = readPlaceEntity(entity([{ rank: 'normal', mainsnak: {} }]))
      expect(place.coordinates).toBeNull()
    })
  })
})
