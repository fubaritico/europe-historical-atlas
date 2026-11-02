import { describe, expect, it } from 'vitest'

import { dateCoversYear, datesOverlap, yearSpanOf } from './dateOverlap'

import type { HistoricalDate, HistoricalMoment } from './historicalDate'

/** A moment, a year by default. */
function moment(fields: Partial<HistoricalMoment> = {}): HistoricalMoment {
  return {
    year: 1100,
    month: null,
    day: null,
    calendar: null,
    circa: false,
    margin: null,
    ...fields,
  }
}

/** A date alone. */
function year(at: number, fields: Partial<HistoricalMoment> = {}): HistoricalDate {
  return { kind: 'instant', at: moment({ year: at, ...fields }) }
}

/** An interval, both ends included. */
function span(from: number, to: number): HistoricalDate {
  return { kind: 'interval', from: moment({ year: from }), to: moment({ year: to }) }
}

describe('dateOverlap', () => {
  describe('happy path', () => {
    it('reads two sheets of the same year as overlapping', () => {
      expect(datesOverlap(year(1100), year(1100))).toBe(true)
    })

    it('reads 1100 and 1101 as apart', () => {
      expect(datesOverlap(year(1100), year(1101))).toBe(false)
    })

    it('reads a year inside an interval as overlapping', () => {
      expect(datesOverlap(year(1100), span(1050, 1150))).toBe(true)
    })
  })

  describe('variants', () => {
    it('gives a date alone the span of its year', () => {
      expect(yearSpanOf(year(1100))).toEqual({ from: 1100, to: 1100 })
    })

    it('gives an interval its start and end years', () => {
      expect(yearSpanOf(span(1050, 1150))).toEqual({ from: 1050, to: 1150 })
    })

    it('reads two intervals that cross as overlapping', () => {
      expect(datesOverlap(span(1050, 1120), span(1100, 1200))).toBe(true)
    })

    it('reads two intervals one after the other as apart', () => {
      expect(datesOverlap(span(1050, 1099), span(1100, 1200))).toBe(false)
    })

    it('answers the same whichever date comes first', () => {
      expect(datesOverlap(span(1050, 1150), year(1100))).toBe(
        datesOverlap(year(1100), span(1050, 1150))
      )
    })
  })

  // L3: N/A — the dates are read before they arrive here (readHistoricalDate); nothing is refused at this step.
  // L4: N/A — pure arithmetic on two read dates, no input of its own to fail on.

  describe('edge cases', () => {
    it('counts both ends of an interval: a year on its last one overlaps', () => {
      expect(datesOverlap(year(1150), span(1050, 1150))).toBe(true)
    })

    it('counts both ends of an interval: a year on its first one overlaps', () => {
      expect(datesOverlap(year(1050), span(1050, 1150))).toBe(true)
    })

    it('does not widen a circa year by its margin: circa 1100 ±10 leaves 1105 free', () => {
      expect(datesOverlap(year(1100, { circa: true, margin: 10 }), year(1105))).toBe(false)
    })

    it('does not narrow a year by its month: March 1100 meets 1100', () => {
      expect(datesOverlap(year(1100, { month: 3 }), year(1100))).toBe(true)
    })

    it('reads 1 BC and AD 1 as apart, there being no year 0 between them', () => {
      expect(datesOverlap(year(-1), year(1))).toBe(false)
    })
  })
})

// The rule the atlas's events and the Cartographer's cities are shown by (2026-11-02).
describe('dateCoversYear', () => {
  describe('happy path', () => {
    it('covers 1100 with a date of 1100, not 1101', () => {
      expect([dateCoversYear(year(1100), 1100), dateCoversYear(year(1100), 1101)]).toEqual([
        true,
        false,
      ])
    })
  })

  describe('variants', () => {
    it('covers an interval’s first and last years and none after', () => {
      expect([1098, 1099, 1101, 1102].map((at) => dateCoversYear(span(1099, 1101), at))).toEqual([
        false,
        true,
        true,
        false,
      ])
    })
  })

  // L3, L4: N/A — two comparisons.

  describe('edge cases', () => {
    it('does not widen a circa date to its margin', () => {
      expect(dateCoversYear(year(1100, { circa: true, margin: 10 }), 1105)).toBe(false)
    })
  })
})
