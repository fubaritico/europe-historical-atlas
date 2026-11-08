import { describe, expect, it } from 'vitest'

import { mapYearAt, mapsToPrepare } from './mapOfDate'

/** Centuries, and an emblematic year between two of them. */
const MAPS = [1100, 1200, 1214, 1300, 1400]

// ATLAS-333, the dev, 2026-11-08: a map stays until another map's date is reached.
describe('mapYearAt', () => {
  describe('happy path', () => {
    it('shows 1100’s map at 1150, though 1200 is nearer', () => {
      expect(mapYearAt(1150, MAPS)).toBe(1100)
    })
  })

  describe('variants', () => {
    it('shows a map on its own year', () => {
      expect(mapYearAt(1214, MAPS)).toBe(1214)
    })

    it('shows 1200’s map until the emblematic 1214 is reached', () => {
      expect(mapYearAt(1213, MAPS)).toBe(1200)
    })

    it('reads the years in any order', () => {
      expect(mapYearAt(1250, [1300, 1100, 1214])).toBe(1214)
    })

    it('keeps the last map after it', () => {
      expect(mapYearAt(2000, MAPS)).toBe(1400)
    })
  })

  describe('managed errors', () => {
    it('shows no map before the first one', () => {
      expect(mapYearAt(1099, MAPS)).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('shows no map when none is drawn', () => {
      expect(mapYearAt(1100, [])).toBeNull()
    })
  })

  // L4: N/A — numbers in, a number out.
})

describe('mapsToPrepare', () => {
  describe('happy path', () => {
    it('going forward from 1200, prepares 1214, then 1100, then further ahead', () => {
      expect(mapsToPrepare(1200, 'forward', MAPS, 2)).toEqual([1214, 1100, 1300])
    })
  })

  describe('variants', () => {
    it('going back from 1300, prepares 1214, then 1400, then further back', () => {
      expect(mapsToPrepare(1300, 'back', MAPS, 2)).toEqual([1214, 1400, 1200])
    })

    it('with a reach of one, prepares the map either side', () => {
      expect(mapsToPrepare(1214, 'forward', MAPS, 1)).toEqual([1300, 1200])
    })

    it('reads the years in any order, each once', () => {
      expect(mapsToPrepare(1200, 'forward', [1300, 1100, 1200, 1300], 1)).toEqual([1300, 1100])
    })
  })

  describe('managed errors', () => {
    it('refuses a reach of nought', () => {
      expect(() => mapsToPrepare(1200, 'forward', MAPS, 0)).toThrow('at least one')
    })

    it('refuses a reach that is not whole', () => {
      expect(() => mapsToPrepare(1200, 'forward', MAPS, 1.5)).toThrow('whole number')
    })
  })

  describe('edge cases', () => {
    it('at the last map going forward, prepares only behind', () => {
      expect(mapsToPrepare(1400, 'forward', MAPS, 2)).toEqual([1300, 1214])
    })

    it('with a single map, prepares nothing', () => {
      expect(mapsToPrepare(1100, 'back', [1100], 3)).toEqual([])
    })
  })

  // L4: N/A — numbers in, numbers out.
})
