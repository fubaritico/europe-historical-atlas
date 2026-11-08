import { describe, expect, it } from 'vitest'

import { STARTUP_SLICES, createStartupBar } from './startupBar'

import type { StartupStep } from './startupBar'

/** The steps in the order the startup runs them. */
const ORDER: StartupStep[] = ['terrain', 'texture', 'scene', 'year', 'names', 'events']

describe('createStartupBar', () => {
  describe('happy path', () => {
    it('lays a step’s progress on its slice, with its words', () => {
      const told: [number, string][] = []
      createStartupBar((fraction, label) => told.push([fraction, label])).step(
        'texture',
        0.5,
        'Composition de la texture…'
      )
      const [from, to] = STARTUP_SLICES.texture
      expect(told).toEqual([[from + (to - from) / 2, 'Composition de la texture…']])
    })
  })

  describe('variants', () => {
    it('tells the words of the step now running, even when the bar holds still', () => {
      const told: [number, string][] = []
      const bar = createStartupBar((fraction, label) => told.push([fraction, label]))
      bar.step('year', 0.5, 'Découpe des territoires…')
      bar.step('year', 0.2, 'Tracé des frontières…')
      expect(told.at(-1)?.[1]).toBe('Tracé des frontières…')
      expect(told.at(-1)?.[0]).toBe(told[0]?.[0])
    })
  })

  describe('edge cases', () => {
    it('cuts the whole bar into slices end to end, in the order the steps run', () => {
      expect(ORDER.map((step) => STARTUP_SLICES[step])).toEqual([
        [0, STARTUP_SLICES.texture[0]],
        [STARTUP_SLICES.terrain[1], STARTUP_SLICES.scene[0]],
        [STARTUP_SLICES.texture[1], STARTUP_SLICES.year[0]],
        [STARTUP_SLICES.scene[1], STARTUP_SLICES.names[0]],
        [STARTUP_SLICES.year[1], STARTUP_SLICES.events[0]],
        [STARTUP_SLICES.names[1], 1],
      ])
    })

    // Review ARCH-004: a bar full while the events are awaited reads as hung.
    it('is not full while the events are awaited, and full once they are in', () => {
      const told: number[] = []
      const bar = createStartupBar((fraction) => told.push(fraction))
      bar.step('events', 0, 'Pose des événements…')
      bar.step('events', 1, 'Pose des événements…')
      expect(told[0]).toBeLessThan(1)
      expect(told[1]).toBe(1)
    })
  })

  // L3, L4: N/A — nothing is refused; out-of-range progress is the sliced bar's own (core's slicedProgress).
})
