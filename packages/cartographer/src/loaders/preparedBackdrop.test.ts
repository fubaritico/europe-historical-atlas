import { afterEach, describe, expect, it, vi } from 'vitest'

import { preparedBackdrop } from './preparedBackdrop'

import type { OpeningProgress } from './opening'

/**
 * A load the test answers by hand, recording its progress sink.
 * @returns the load, how to answer it, and how many times it ran
 */
function handLoad() {
  const runs: {
    sink: OpeningProgress
    resolve: (v: string) => void
    reject: (e: unknown) => void
  }[] = []
  const load = vi.fn(
    (sink: OpeningProgress) =>
      new Promise<string>((resolve, reject) => {
        runs.push({ sink, resolve, reject })
      })
  )
  return { load, runs, last: () => runs[runs.length - 1] }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('preparedBackdrop', () => {
  describe('happy path', () => {
    it('bakes once from the opening, and hands the same backdrop to the map when it mounts', async () => {
      const { load, last } = handLoad()
      const backdrop = preparedBackdrop(load)

      backdrop.prepare()
      const joined = backdrop.load(() => undefined)
      last()?.resolve('the relief')

      expect(await joined).toBe('the relief')
      expect(load).toHaveBeenCalledTimes(1)
    })
  })

  describe('variants', () => {
    it('a map mounted again — after signing out and in — finds it ready, never baked anew', async () => {
      const { load, last } = handLoad()
      const backdrop = preparedBackdrop(load)
      backdrop.prepare()
      last()?.resolve('the relief')
      await backdrop.load(() => undefined)

      expect(await backdrop.load(() => undefined)).toBe('the relief')
      expect(load).toHaveBeenCalledTimes(1)
    })

    it('replays the progress so far to a map that joins late, then forwards the rest', () => {
      const { load, last } = handLoad()
      const backdrop = preparedBackdrop(load)
      backdrop.prepare()
      last()?.sink(0.4, 'relief')
      const bar = vi.fn()

      void backdrop.load(bar)
      last()?.sink(0.8, 'coast')

      expect(bar.mock.calls).toEqual([
        [0.4, 'relief'],
        [0.8, 'coast'],
      ])
    })

    it('a load with no preparation before starts it', () => {
      const { load } = handLoad()

      void preparedBackdrop(load).load(() => undefined)

      expect(load).toHaveBeenCalledTimes(1)
    })
  })

  describe('managed errors', () => {
    it('a preparation that fails is said on the console and forgotten — the map’s own load meets it again', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { load, runs } = handLoad()
      const backdrop = preparedBackdrop(load)
      backdrop.prepare()
      runs[0]?.reject(new Error('offline'))
      await Promise.resolve()
      await Promise.resolve()

      const again = backdrop.load(() => undefined)
      runs[1]?.resolve('the relief')

      expect(error).toHaveBeenCalledWith(
        '[Cartographer] the backdrop could not be prepared:',
        expect.any(Error)
      )
      expect(await again).toBe('the relief')
      expect(load).toHaveBeenCalledTimes(2)
    })
  })

  describe('unmanaged errors', () => {
    it('hands the failure to a map already waiting on it, which shows it', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { load, last } = handLoad()
      const backdrop = preparedBackdrop(load)
      const waiting = backdrop.load(() => undefined)

      last()?.reject(new Error('unreadable'))

      await expect(waiting).rejects.toThrow('unreadable')
    })
  })

  describe('edge cases', () => {
    it('prepare called twice starts one bake', () => {
      const { load } = handLoad()
      const backdrop = preparedBackdrop(load)

      backdrop.prepare()
      backdrop.prepare()

      expect(load).toHaveBeenCalledTimes(1)
    })
  })
})
