import { describe, expect, it } from 'vitest'

import { createSlicedProgress } from './slicedProgress'

const SLICES = { load: [0, 0.2], bake: [0.2, 0.8], lay: [0.8, 1] } as const

/**
 * A bar whose reports are recorded.
 * @returns the step to drive, and what it told
 */
function recorded(): {
  step: ReturnType<typeof createSlicedProgress<keyof typeof SLICES>>
  told: [number, string][]
} {
  const told: [number, string][] = []
  const step = createSlicedProgress(SLICES, (fraction, running) => told.push([fraction, running]))
  return { step, told }
}

describe('createSlicedProgress', () => {
  describe('happy path', () => {
    it('lays a step’s progress on its slice', () => {
      const { step, told } = recorded()
      step('bake', 0.5)
      expect(told).toEqual([[0.5, 'bake']])
    })
  })

  describe('variants', () => {
    it('starts a step at its slice’s start when no progress is given', () => {
      const { step, told } = recorded()
      step('lay')
      expect(told).toEqual([[0.8, 'lay']])
    })

    it('ends a step at its slice’s end', () => {
      const { step, told } = recorded()
      step('load', 1)
      expect(told).toEqual([[0.2, 'load']])
    })
  })

  describe('unmanaged errors', () => {
    it('holds a progress past either end of the step to the step', () => {
      const { step, told } = recorded()
      step('bake', 3)
      step('bake', -1)
      expect(told.map(([fraction]) => fraction)).toEqual([0.8, 0.8])
    })
  })

  describe('edge cases', () => {
    it('never goes back, even when an earlier step reports late', () => {
      const { step, told } = recorded()
      step('bake', 0.5)
      step('load', 0.5)
      expect(told).toEqual([
        [0.5, 'bake'],
        [0.5, 'load'],
      ])
    })
  })

  // L3: N/A — nothing is refused.
})
