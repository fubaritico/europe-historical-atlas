import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadCities, toLoadedCity } from './cityLoad'

import type { ContentCity, ContentFile } from '@europe-historical-atlas/core/data/contentFormat'

const SARKEL: ContentCity = {
  id: '113',
  place: {
    id: '121',
    name: { fr: 'Sarkel', en: null },
    lon: 42.27,
    lat: 47.7,
    wikidata: 'Q1068190',
    existsFrom: null,
    existsTo: null,
  },
  date: {
    kind: 'instant',
    at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
  },
  importance: 'city',
  reasons: [],
  testimonies: [],
  holder: null,
  showInAtlas: false,
}

afterEach(() => {
  vi.restoreAllMocks()
})

/** A sink that keeps what it is handed. */
function sink() {
  const got: { cities: unknown[] | null; failed: string | null } = { cities: null, failed: null }
  return {
    got,
    setCities: (cities: readonly unknown[]) => {
      got.cities = [...cities]
    },
    setCitiesFailed: (reason: string) => {
      got.failed = reason
    },
  }
}

describe('cityLoad', () => {
  describe('happy path', () => {
    it('hands the store Sarkel with its French name, its position and its date', async () => {
      const into = sink()
      const file: ContentFile = { version: 1, events: [], cities: [SARKEL] }
      await loadCities({ load: () => Promise.resolve(file) }, into)
      expect(into.got).toEqual({ cities: [toLoadedCity(SARKEL)], failed: null })
      expect(toLoadedCity(SARKEL)).toEqual({
        id: '113',
        name: 'Sarkel',
        lon: 42.27,
        lat: 47.7,
        date: SARKEL.date,
        holder: null,
        holderSources: [],
      })
    })
  })

  describe('variants', () => {
    it('keeps the holder and only the lines saying who held it, two sources disagreeing kept both', () => {
      const source = { id: '1', title: 'Duby', author: null, url: null }
      const venice = { name: 'Venise', wikidata: 'Q4948' }
      const byzantium = { name: 'Byzance', wikidata: 'Q12544' }
      const zadar: ContentCity = {
        ...SARKEL,
        holder: venice,
        testimonies: [
          { source, where: 'p. 12', quotation: null, subject: 'holder', holder: venice },
          { source, where: null, quotation: null, subject: 'population', population: 4000 },
          {
            source: { ...source, title: 'Ostrogorsky' },
            where: null,
            quotation: null,
            subject: 'holder',
            holder: byzantium,
          },
        ],
      }
      const city = toLoadedCity(zadar)
      expect(city.holder).toEqual(venice)
      expect(city.holderSources).toEqual([
        { title: 'Duby', where: 'p. 12', holder: venice },
        { title: 'Ostrogorsky', where: null, holder: byzantium },
      ])
    })
  })

  describe('managed errors', () => {
    it('says a failed read to the store and to the console, and hands no city', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const into = sink()
      await loadCities({ load: () => Promise.reject(new Error('HTTP 404')) }, into)
      expect(into.got).toEqual({ cities: null, failed: 'HTTP 404' })
      expect(error).toHaveBeenCalledTimes(1)
    })
  })

  describe('unmanaged errors', () => {
    it('says a thrown value that is not an error, as text', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const into = sink()
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the case under test
      await loadCities({ load: () => Promise.reject('offline') }, into)
      expect(into.got.failed).toBe('offline')
    })
  })

  // L5: N/A — an empty export is a list of none, which the slice and the panel say.
})
