import { describe, expect, it } from 'vitest'

import { startStep, timedStep, yearMeasureName } from './yearTiming'

import type { YearClock } from './yearTiming'

/**
 * A clock that moves only when told, and keeps every measure it is handed.
 * @returns the clock, how to move it, and the measures
 */
function stillClock(): {
  clock: YearClock
  advance: (ms: number) => void
  measures: { name: string; start: number; end: number }[]
} {
  let time = 100
  const measures: { name: string; start: number; end: number }[] = []
  return {
    clock: {
      now: () => time,
      measure: (name, { start, end }) => measures.push({ name, start, end }),
    },
    advance: (ms) => {
      time += ms
    },
    measures,
  }
}

// ATLAS-333: a change of year's steps, measured in the reader's browser.
describe('yearTiming', () => {
  describe('happy path', () => {
    it('measures 1200’s fills from when they start to when they end', () => {
      const { clock, advance, measures } = stillClock()
      const end = startStep(clock, 1200, 'fills')
      advance(42)
      end()
      expect(measures).toEqual([{ name: 'atlas year 1200 fills', start: 100, end: 142 }])
    })
  })

  describe('variants', () => {
    it('measures a step’s promise once it resolves, its value untouched', async () => {
      const { clock, measures } = stillClock()
      await expect(
        timedStep(clock, 1100, 'fetch', () => Promise.resolve('the year'))
      ).resolves.toBe('the year')
      expect(measures.map(({ name }) => name)).toEqual([yearMeasureName(1100, 'fetch')])
    })
  })

  describe('variants, the first part', () => {
    it('counts the work an async step does before its first wait', async () => {
      const { clock, advance, measures } = stillClock()
      await timedStep(clock, 1100, 'restore', () => {
        advance(69)
        return Promise.resolve()
      })
      expect(measures[0]?.end).toBe((measures[0]?.start ?? 0) + 69)
    })
  })

  describe('managed errors', () => {
    it('measures a step that failed too, its failure passed on', async () => {
      const { clock, measures } = stillClock()
      await expect(
        timedStep(clock, 1100, 'prepare', () => Promise.reject(new Error('the GPU said no')))
      ).rejects.toThrow('the GPU said no')
      expect(measures).toHaveLength(1)
    })
  })

  describe('edge cases', () => {
    it('measures nothing for a step never ended', () => {
      const { clock, measures } = stillClock()
      startStep(clock, 1100, 'borders')
      expect(measures).toEqual([])
    })
  })

  // L4: N/A — a clock in, measures out.
})
