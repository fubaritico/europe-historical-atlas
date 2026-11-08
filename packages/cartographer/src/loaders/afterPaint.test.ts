import { describe, expect, it } from 'vitest'

import { createAfterPaint } from './afterPaint'

/** A clock whose frames and tasks run only when the test says so. */
const manualClock = (hidden: boolean) => {
  const frames: (() => void)[] = []
  const tasks: (() => void)[] = []
  return {
    frames,
    tasks,
    clock: {
      hidden: () => hidden,
      requestFrame: (callback: () => void) => {
        frames.push(callback)
      },
      queueTask: (callback: () => void) => {
        tasks.push(callback)
      },
    },
  }
}

/** Whether a promise has settled, read after the microtasks have run. */
const settled = async (promise: Promise<void>): Promise<boolean> => {
  let done = false
  void promise.then(() => {
    done = true
  })
  await Promise.resolve()
  await Promise.resolve()
  return done
}

describe('createAfterPaint', () => {
  describe('happy path', () => {
    it('resolves only after the frame and the task queued from it', async () => {
      const { frames, tasks, clock } = manualClock(false)
      const waiting = createAfterPaint(clock)()

      expect(await settled(waiting)).toBe(false)
      frames.shift()?.()
      expect(await settled(waiting)).toBe(false)
      tasks.shift()?.()

      expect(await settled(waiting)).toBe(true)
    })
  })

  describe('variants', () => {
    it('resolves at once in a hidden tab, asking for no frame', async () => {
      const { frames, clock } = manualClock(true)

      const waiting = createAfterPaint(clock)()

      expect(await settled(waiting)).toBe(true)
      expect(frames).toHaveLength(0)
    })
  })

  // L3, L4: N/A — nothing here can fail; the clock's three functions are the page's own.
  describe('edge cases', () => {
    it('waits for a frame of its own at each call', () => {
      const { frames, clock } = manualClock(false)
      const afterPaint = createAfterPaint(clock)

      void afterPaint()
      void afterPaint()

      expect(frames).toHaveLength(2)
    })
  })
})
