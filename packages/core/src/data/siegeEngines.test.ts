import { describe, expect, it } from 'vitest'

import { siegeEngineAt } from './siegeEngines'

import type { SiegeEnginePeriod } from './siegeEngines'
import type { HistoricalDate, HistoricalMoment } from '../time/historicalDate'

/**
 * A moment of a year, or of a month of it.
 * @param year - the year
 * @param month - the month, or `null`
 * @param circa - approximate or not
 * @returns the moment
 */
function moment(year: number, month: number | null = null, circa = false): HistoricalMoment {
  return { year, month, day: null, calendar: null, circa, margin: null }
}

/**
 * The instant of a year.
 * @param year - the year
 * @returns the date
 */
function year(year: number): HistoricalDate {
  return { kind: 'instant', at: moment(year) }
}

/**
 * An interval between two years.
 * @param from - its first year
 * @param to - its last year
 * @returns the date
 */
function years(from: number, to: number): HistoricalDate {
  return { kind: 'interval', from: moment(from), to: moment(to) }
}

/** The table of the plan: the traction trebuchet, then the counterweight one, then the cannon, still in use. */
const EUROPE: SiegeEnginePeriod[] = [
  { engine: 'traction-trebuchet', inUse: years(808, 1450) },
  { engine: 'counterweight-trebuchet', inUse: years(1217, 1450) },
  { engine: 'cannon', inUse: year(1326) },
]

describe('siegeEngineAt', () => {
  describe('happy path', () => {
    it('draws a siege of 1100 with the traction trebuchet, the only engin in use', () => {
      expect(siegeEngineAt(EUROPE, year(1100))).toBe('traction-trebuchet')
    })
  })

  describe('variants', () => {
    it('takes the newest of two engins in use: the counterweight trebuchet in 1250', () => {
      expect(siegeEngineAt(EUROPE, year(1250))).toBe('counterweight-trebuchet')
    })

    it('takes the newest of three engins in use: the cannon in 1400', () => {
      expect(siegeEngineAt(EUROPE, year(1400))).toBe('cannon')
    })

    it('finds the newest whatever order the periods are given in', () => {
      expect(siegeEngineAt([...EUROPE].reverse(), year(1250))).toBe('counterweight-trebuchet')
    })

    it('reads an instant period as still in use, long after it began', () => {
      expect(siegeEngineAt(EUROPE, year(1800))).toBe('cannon')
    })

    it('decides by the beginning of a siege that lasts: 1215–1218 began before the counterweight', () => {
      expect(siegeEngineAt(EUROPE, years(1215, 1218))).toBe('traction-trebuchet')
    })
  })

  describe('managed errors', () => {
    it('answers no engin for a siege before every period, for the map to show the tower alone', () => {
      expect(siegeEngineAt(EUROPE, year(700))).toBeNull()
    })

    it('answers no engin in a hole of the table', () => {
      const holed: SiegeEnginePeriod[] = [
        { engine: 'traction-trebuchet', inUse: years(808, 1200) },
        { engine: 'cannon', inUse: year(1326) },
      ]
      expect(siegeEngineAt(holed, year(1250))).toBeNull()
    })

    it('answers no engin with no table at all', () => {
      expect(siegeEngineAt([], year(1100))).toBeNull()
    })
  })

  // L4: N/A — pure and synchronous; its dates were checked by the schema that read them.

  describe('edge cases', () => {
    it('counts both ends of a period: its first year and its last', () => {
      expect(siegeEngineAt(EUROPE, year(1217))).toBe('counterweight-trebuchet')
      const ended: SiegeEnginePeriod[] = [{ engine: 'traction-trebuchet', inUse: years(808, 1200) }]
      expect(siegeEngineAt(ended, year(1200))).toBe('traction-trebuchet')
      expect(siegeEngineAt(ended, year(1201))).toBeNull()
    })

    it('reads a circa beginning at its best-estimate year', () => {
      const circa: SiegeEnginePeriod[] = [
        { engine: 'cannon', inUse: { kind: 'instant', at: moment(1326, null, true) } },
      ]
      expect(siegeEngineAt(circa, year(1325))).toBeNull()
      expect(siegeEngineAt(circa, year(1326))).toBe('cannon')
    })

    it('compares at the precision both share: a siege in March 1326 is within a period from 1326', () => {
      expect(siegeEngineAt(EUROPE, { kind: 'instant', at: moment(1326, 3) })).toBe('cannon')
    })

    it('keeps the first given of two engins that began the same year', () => {
      const tied: SiegeEnginePeriod[] = [
        { engine: 'counterweight-trebuchet', inUse: year(1217) },
        { engine: 'cannon', inUse: year(1217) },
      ]
      expect(siegeEngineAt(tied, year(1300))).toBe('counterweight-trebuchet')
    })
  })
})
