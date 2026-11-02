import { describe, expect, it } from 'vitest'

import { eventsOfYear } from './eventsOfYear'

import type {
  HistoricalDate,
  HistoricalMoment,
} from '@europe-historical-atlas/core/time/historicalDate'

const moment = (year: number): HistoricalMoment => ({
  year,
  month: null,
  day: null,
  calendar: null,
  circa: false,
  margin: null,
})
const on = (id: string, year: number): { id: string; date: HistoricalDate } => ({
  id,
  date: { kind: 'instant', at: moment(year) },
})
const over = (id: string, from: number, to: number): { id: string; date: HistoricalDate } => ({
  id,
  date: { kind: 'interval', from: moment(from), to: moment(to) },
})

// The dev, 2026-11-02: the events of 1100 were still shown on the map of 1200.
describe('eventsOfYear', () => {
  describe('happy path', () => {
    it('keeps the events of 1100 on 1100 and none of them on 1200', () => {
      const events = [on('barbastro', 1100), on('poitiers', 1100)]
      expect(eventsOfYear(events, 1100).map(({ id }) => id)).toEqual(['barbastro', 'poitiers'])
      expect(eventsOfYear(events, 1200)).toEqual([])
    })
  })

  describe('variants', () => {
    it('keeps an interval on its first year, its last year and between, not after', () => {
      const events = [over('siege', 1199, 1201)]
      expect(
        [1198, 1199, 1200, 1201, 1202].map((year) => eventsOfYear(events, year).length)
      ).toEqual([0, 1, 1, 1, 0])
    })

    it('does not widen a circa date to its margin', () => {
      const circa: { id: string; date: HistoricalDate } = {
        id: 'circa',
        date: { kind: 'instant', at: { ...moment(1100), circa: true, margin: 10 } },
      }
      expect([eventsOfYear([circa], 1100).length, eventsOfYear([circa], 1105).length]).toEqual([
        1, 0,
      ])
    })
  })

  // L3, L4: N/A — a filter over dates already read.
  describe('edge cases', () => {
    it('keeps nothing from no events', () => {
      expect(eventsOfYear([], 1100)).toEqual([])
    })
  })
})
