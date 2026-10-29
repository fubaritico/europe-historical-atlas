import { describe, expect, it } from 'vitest'

import { fadeIn } from './fadeIn'

import type { FadeClock } from './fadeIn'

/**
 * A clock driven by hand: each frame moves the time on by a step.
 * @param stepMs - how long a frame lasts
 * @returns the clock, and a way to run the frames asked for
 */
function handClock(stepMs: number): { clock: FadeClock; runFrames: () => void } {
  let time = 0
  const queued: (() => void)[] = []
  return {
    clock: {
      now: () => time,
      nextFrame: (step) => {
        queued.push(step)
      },
    },
    runFrames: () => {
      while (queued.length > 0) {
        time += stepMs
        queued.shift()?.()
      }
    },
  }
}

// The dev, 2026-10-29: the countries, their names and the events fade in together over the relief.
describe('fadeIn', () => {
  describe('happy path', () => {
    it('goes from nothing to whole over its duration, and resolves once whole', async () => {
      const { clock, runFrames } = handClock(100)
      const shares: number[] = []
      const done = fadeIn((share) => shares.push(share), 400, clock)
      runFrames()
      await done
      expect([shares[0], shares.at(-1), shares.length]).toEqual([0, 1, 5])
    })
  })

  describe('variants', () => {
    it('never goes back down on its way', () => {
      const { clock, runFrames } = handClock(30)
      const shares: number[] = []
      void fadeIn((share) => shares.push(share), 500, clock)
      runFrames()
      expect(shares.every((share, at) => at === 0 || share >= (shares[at - 1] ?? 0))).toBe(true)
    })

    it('starts slowly and settles slowly, eased', () => {
      const { clock, runFrames } = handClock(100)
      const shares: number[] = []
      void fadeIn((share) => shares.push(share), 1000, clock)
      runFrames()
      // A tenth of the time in, less than a tenth of the way; halfway in, halfway.
      expect(shares[1]).toBeLessThan(0.1)
      expect(shares[5]).toBeCloseTo(0.5, 9)
    })
  })

  // L3, L4: N/A — a share computed from a clock it is handed.

  describe('edge cases', () => {
    it('sets it whole at once, with no frame, for a duration of nought — reduced motion', async () => {
      const { clock } = handClock(16)
      const shares: number[] = []
      await fadeIn((share) => shares.push(share), 0, clock)
      expect(shares).toEqual([1])
    })
  })
})
