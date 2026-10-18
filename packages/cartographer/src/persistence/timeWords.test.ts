import { describe, expect, it } from 'vitest'

import { timeWords } from './timeWords'

const NOW = new Date(2026, 9, 17, 16, 30)

describe('timeWords', () => {
  describe('happy path', () => {
    it('says "today" for a time of the same day', () => {
      expect(timeWords(new Date(2026, 9, 17, 9, 5).toISOString(), NOW)).toBe('today at 09:05')
    })
  })

  describe('variants', () => {
    it('says "yesterday" for a time of the day before', () => {
      expect(timeWords(new Date(2026, 9, 16, 23, 10).toISOString(), NOW)).toBe('yesterday at 23:10')
    })

    // The snapshot list, where two copies of one minute must be told apart (the dev, 2026-10-18).
    it('gives the seconds when asked', () => {
      expect(timeWords(new Date(2026, 9, 17, 9, 5, 7).toISOString(), NOW, { seconds: true })).toBe(
        'today at 09:05:07'
      )
    })

    it('gives the date for an older time', () => {
      expect(timeWords(new Date(2026, 9, 2, 8, 0).toISOString(), NOW)).toBe(
        'on 2 October 2026 at 08:00'
      )
    })
  })

  describe('managed errors', () => {
    it('says the time is unknown rather than inventing one', () => {
      expect(timeWords('not a date', NOW)).toBe('at an unknown time (not a date)')
    })
  })

  // L4: N/A — date arithmetic over a string, nothing thrown.

  describe('edge cases', () => {
    it('says "yesterday" across the first of the month', () => {
      const firstOfNovember = new Date(2026, 10, 1, 10, 0)
      expect(timeWords(new Date(2026, 9, 31, 22, 0).toISOString(), firstOfNovember)).toBe(
        'yesterday at 22:00'
      )
    })
  })
})
