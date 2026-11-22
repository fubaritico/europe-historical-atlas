import { describe, expect, it } from 'vitest'

import { cityName } from './cityName'

import type { ContentCity } from './contentFormat'

/** Ankara, as the export writes its place. */
const place: ContentCity['place'] = {
  id: '67',
  name: { fr: 'Ankara', en: null },
  lon: 32.85,
  lat: 39.93,
  wikidata: 'Q3640',
  existsFrom: null,
  existsTo: null,
}

const ancyra = {
  place,
  periodName: [
    { language: 'fr', form: 'Ancyre' },
    { language: 'en', form: 'Ancyra' },
  ],
} satisfies Pick<ContentCity, 'place' | 'periodName'>

describe('cityName', () => {
  describe('happy path', () => {
    it('writes the name of the time in the reader’s language', () => {
      expect(cityName(ancyra, 'fr')).toBe('Ancyre')
      expect(cityName(ancyra, 'en')).toBe('Ancyra')
    })
  })

  describe('variants', () => {
    it('writes the place’s name when the sheet names no name of the time', () => {
      expect(cityName({ place, periodName: null }, 'fr')).toBe('Ankara')
    })
  })

  // L3–L4: N/A — a pure reading of a checked export; a missing form is an answer, below.
  describe('edge cases', () => {
    it('writes the place’s name for a reader whose language the name of the time has no form in', () => {
      expect(cityName(ancyra, 'de')).toBe('Ankara')
    })
  })
})
