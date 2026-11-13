import { describe, expect, it } from 'vitest'

import { SEA_NAMES, SEA_NAME_OPACITY, seaNameText } from './seaNames'

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
    it('writes a name in capitals', () => {
      expect(SEA_NAMES.map(seaNameText)[0]).toBe('ATLANTIC OCEAN')
    })
  })

  // L3–L4: N/A — constant data, no input.

  describe('edge cases', () => {
    it('lays every name with its whole length inside the map’s frame', () => {
      for (const sea of SEA_NAMES) {
        const half = sea.lengthDeg / 2
        expect(sea.lon - half, sea.id).toBeGreaterThan(FRAME.west)
        expect(sea.lon + half, sea.id).toBeLessThan(FRAME.east)
        expect(sea.lat, sea.id).toBeGreaterThan(FRAME.south)
        expect(sea.lat, sea.id).toBeLessThan(FRAME.north)
      }
    })

    it('keeps the names see-through, as the dev asked: 30 to 40 %', () => {
      expect(SEA_NAME_OPACITY).toBeGreaterThanOrEqual(0.3)
      expect(SEA_NAME_OPACITY).toBeLessThanOrEqual(0.4)
    })
  })
})
