import { describe, expect, it, vi } from 'vitest'

import { cityPins } from './cityPins'

import type { ContentCity } from '@europe-historical-atlas/core/data/contentFormat'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/** A frame from 0° to 20° east, 40° to 60° north. */
const BOUNDS: GeoBounds = { west: 0, east: 20, south: 40, north: 60 }

/**
 * A city of 1100 at a point.
 * @param id - its sheet
 * @param lon - its longitude
 * @param lat - its latitude
 * @returns the city
 */
function city(id: string, lon: number, lat: number): ContentCity {
  return {
    id,
    place: { id, name: { fr: `Ville ${id}`, en: null }, lon, lat, wikidata: null },
    date: {
      kind: 'instant',
      at: { year: 1100, month: null, day: null, circa: false, margin: null, calendar: null },
    },
    importance: 'city',
    reasons: [],
    testimonies: [],
  } as unknown as ContentCity
}

describe('cityPins', () => {
  describe('happy path', () => {
    it('places a city inside the frame as fractions across and down', () => {
      const [pin] = cityPins([city('1', 10, 50)], BOUNDS, vi.fn())

      expect(pin?.u).toBeCloseTo(0.5)
      expect(pin?.v).toBeGreaterThan(0)
      expect(pin?.v).toBeLessThan(1)
    })
  })

  describe('variants', () => {
    it('keeps the cities’ order', () => {
      const pins = cityPins([city('a', 5, 50), city('b', 15, 50)], BOUNDS, vi.fn())

      expect(pins.map((pin) => pin.city.id)).toEqual(['a', 'b'])
    })
  })

  describe('managed errors', () => {
    it('leaves out a city outside the frame, and says so', () => {
      const warn = vi.fn()

      const pins = cityPins([city('9', 40, 50)], BOUNDS, warn)

      expect(pins).toEqual([])
      expect(warn).toHaveBeenCalledWith(
        "[Atlas] city 9 (Ville 9) is outside the map's frame and is not drawn"
      )
    })
  })

  // L4: N/A — pure arithmetic over literals.

  describe('edge cases', () => {
    it('places a city on the frame’s edge', () => {
      expect(cityPins([city('e', 0, 50)], BOUNDS, vi.fn())).toHaveLength(1)
    })
  })
})
