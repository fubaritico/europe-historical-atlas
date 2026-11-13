import { describe, expect, it } from 'vitest'

import { SEA_NAMES, SEA_NAME_OPACITY, seaArcAt, seaNameText } from './seaNames'

/** The map's frame (`years/index.json`). */
const FRAME = { west: -45, south: 11.178401873711783, east: 78.75, north: 76.84081641443098 }

describe('seaNames', () => {
  describe('happy path', () => {
    it('names the dev’s eight seas, once each', () => {
      expect(SEA_NAMES.map((sea) => sea.id)).toEqual([
        'atlantic',
        'north-sea',
        'baltic',
        'mediterranean',
        'black-sea',
        'caspian',
        'red-sea',
        'indian',
      ])
    })
  })

  describe('variants', () => {
    it('writes a name in capitals, in English for an English reader', () => {
      expect(SEA_NAMES.map((sea) => seaNameText(sea, 'en'))[0]).toBe('ATLANTIC OCEAN')
    })

    it('writes a name in capitals, accents kept, in French for a French reader', () => {
      expect(SEA_NAMES.map((sea) => seaNameText(sea, 'fr'))[0]).toBe('OCÉAN ATLANTIQUE')
    })
  })

  // L3–L4: N/A — constant data, no input.

  describe('edge cases', () => {
    it('lays every arc inside the map’s frame, from its start to its end', () => {
      for (const sea of SEA_NAMES)
        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
          const at = seaArcAt(sea, t)
          expect(at.lon, sea.id).toBeGreaterThan(FRAME.west)
          expect(at.lon, sea.id).toBeLessThan(FRAME.east)
          expect(at.lat, sea.id).toBeGreaterThan(FRAME.south)
          expect(at.lat, sea.id).toBeLessThan(FRAME.north)
        }
    })

    it('starts an arc on its start and ends it on its end', () => {
      const sea = SEA_NAMES[0]
      if (sea === undefined) throw new Error('no sea')
      expect([seaArcAt(sea, 0), seaArcAt(sea, 1)]).toEqual([sea.from, sea.to])
    })

    it('keeps the names see-through, as the dev asked: 30 to 40 %, then a little less', () => {
      expect(SEA_NAME_OPACITY).toBeGreaterThanOrEqual(0.25)
      expect(SEA_NAME_OPACITY).toBeLessThanOrEqual(0.4)
    })
  })
})
