import { describe, expect, it, vi } from 'vitest'

import { createComputedYears } from './computedYears'

// ATLAS-396, the dev, 2026-11-10: a map being prepared is joined by the click on it, never computed twice.

/**
 * A compute that resolves when told to.
 * @returns the compute, a spy, and its resolver
 */
function deferredCompute() {
  let resolve: (value: string) => void = () => undefined
  let reject: (error: unknown) => void = () => undefined
  const promise = new Promise<string>((ok, ko) => {
    resolve = ok
    reject = ko
  })
  return { compute: vi.fn(() => promise), resolve, reject }
}

describe('createComputedYears', () => {
  describe('happy path', () => {
    it('hands the click the very compute in flight for its year', async () => {
      const register = createComputedYears<string>()
      const { compute, resolve } = deferredCompute()
      const started = register.start(1300, 'stamp', compute)
      const taken = register.take(1300, 'stamp')
      resolve('1300 cut')
      expect([taken === started, await taken, compute.mock.calls.length]).toEqual([
        true,
        '1300 cut',
        1,
      ])
    })
  })

  describe('variants', () => {
    it('starts no second compute for a year in flight under the same stamp', () => {
      const register = createComputedYears<string>()
      const first = deferredCompute()
      const second = deferredCompute()
      void register.start(1300, 'stamp', first.compute)
      void register.start(1300, 'stamp', second.compute)
      expect([first.compute.mock.calls.length, second.compute.mock.calls.length]).toEqual([1, 0])
    })

    it('starts a new compute when the settings changed since the one in flight', () => {
      const register = createComputedYears<string>()
      const first = deferredCompute()
      const second = deferredCompute()
      void register.start(1300, 'before', first.compute)
      void register.start(1300, 'after', second.compute)
      expect(second.compute.mock.calls.length).toBe(1)
    })

    it('lets the click have nothing of a compute started under other settings', () => {
      const register = createComputedYears<string>()
      void register.start(1300, 'before', deferredCompute().compute)
      expect([register.take(1300, 'after'), register.take(1300, 'before')]).toEqual([null, null])
    })

    it('keeps the window’s years and lets the others go', () => {
      const register = createComputedYears<string>()
      for (const year of [1100, 1200, 1300])
        void register.start(year, 'stamp', deferredCompute().compute)
      register.keepOnly([1200, 1300])
      expect([
        register.take(1100, 'stamp'),
        register.take(1200, 'stamp') !== null,
        register.take(1300, 'stamp') !== null,
      ]).toEqual([null, true, true])
    })

    it('forgets a year set aside', () => {
      const register = createComputedYears<string>()
      void register.start(1300, 'stamp', deferredCompute().compute)
      register.forget(1300)
      expect(register.take(1300, 'stamp')).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('leaves a failed compute to whoever awaits it, and lets a later try start again', async () => {
      const register = createComputedYears<string>()
      const failing = deferredCompute()
      const started = register.start(1300, 'stamp', failing.compute)
      failing.reject(new Error('network'))
      await expect(started).rejects.toThrow('network')
      const again = deferredCompute()
      void register.start(1300, 'stamp', again.compute)
      expect(again.compute.mock.calls.length).toBe(1)
    })
  })

  describe('unmanaged errors', () => {
    it('keeps a newer compute when an older one of the same year fails after it', async () => {
      const register = createComputedYears<string>()
      const old = deferredCompute()
      const oldResult = register.start(1300, 'before', old.compute)
      const fresh = deferredCompute()
      const freshResult = register.start(1300, 'after', fresh.compute)
      old.reject(new Error('late failure'))
      await expect(oldResult).rejects.toThrow('late failure')
      expect(register.take(1300, 'after')).toBe(freshResult)
    })
  })

  describe('edge cases', () => {
    it('hands nothing for a year never started', () => {
      expect(createComputedYears<string>().take(1300, 'stamp')).toBeNull()
    })
  })
})
