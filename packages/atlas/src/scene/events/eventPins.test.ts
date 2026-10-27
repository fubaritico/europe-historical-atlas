import { describe, expect, it, vi } from 'vitest'

import { eventPins } from './eventPins'

import type { ContentEvent, ContentPlace } from '@europe-historical-atlas/core/data/contentFormat'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

const BOUNDS: GeoBounds = { west: -10, south: 30, east: 40, north: 60 }

/**
 * An event at a place.
 * @param id - its id
 * @param place - where, or `null`
 * @returns the event
 */
function event(id: string, place: Pick<ContentPlace, 'lon' | 'lat'> | null): ContentEvent {
  return {
    id,
    title: { fr: `Événement ${id}`, en: null },
    type: { id: 't', name: { fr: 'Siège', en: null }, icon: 'pin', colour: '#e3170a' },
    date: {
      kind: 'instant',
      at: { year: 1099, month: null, day: null, calendar: null, circa: false, margin: null },
    },
    place:
      place === null
        ? null
        : {
            id: 'p',
            name: { fr: 'Lieu', en: null },
            wikidata: null,
            existsFrom: null,
            existsTo: null,
            ...place,
          },
    actors: [],
    description: null,
    sources: [],
    wikidata: null,
    engine: null,
  }
}

describe('eventPins', () => {
  describe('happy path', () => {
    it('places an event inside the frame on the grid', () => {
      const [pin] = eventPins([event('1', { lon: 15, lat: 45 })], BOUNDS)
      expect(pin?.u).toBeCloseTo(0.5)
      expect(pin?.v).toBeGreaterThan(0)
      expect(pin?.v).toBeLessThan(1)
    })
  })

  describe('variants', () => {
    it('places the west edge at u = 0', () => {
      expect(eventPins([event('1', { lon: -10, lat: 45 })], BOUNDS)[0]?.u).toBeCloseTo(0)
    })

    it('keeps the order of the events', () => {
      const pins = eventPins(
        [event('1', { lon: 0, lat: 45 }), event('2', { lon: 20, lat: 45 })],
        BOUNDS
      )
      expect(pins.map((pin) => pin.event.id)).toEqual(['1', '2'])
    })
  })

  describe('managed errors', () => {
    it('leaves out an event with no place, and says nothing', () => {
      const warn = vi.fn()
      expect(eventPins([event('1', null)], BOUNDS, warn)).toEqual([])
      expect(warn).not.toHaveBeenCalled()
    })

    it('leaves out an event outside the frame, and says so', () => {
      const warn = vi.fn()
      expect(eventPins([event('9', { lon: 35.2, lat: 31.7 - 10 })], BOUNDS, warn)).toEqual([])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('event 9'))
    })
  })

  // L4: N/A — pure arithmetic over a checked file

  describe('edge cases', () => {
    it('pins nothing for no events', () => {
      expect(eventPins([], BOUNDS)).toEqual([])
    })

    it('leaves out a place just east of the frame', () => {
      expect(eventPins([event('1', { lon: 40.01, lat: 45 })], BOUNDS, () => undefined)).toEqual([])
    })
  })
})
