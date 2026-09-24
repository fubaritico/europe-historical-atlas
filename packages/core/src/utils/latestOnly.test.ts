import { describe, expect, it } from 'vitest'

import { createLatestOnly } from './latestOnly'

describe('createLatestOnly', () => {
  describe('happy path', () => {
    it('lets a lone call through', () => {
      expect(createLatestOnly().begin()()).toBe(true)
    })

    it('keeps letting the same call through while it is still the newest', () => {
      const isCurrent = createLatestOnly().begin()
      expect(isCurrent()).toBe(true)
      expect(isCurrent()).toBe(true)
    })
  })

  describe('variants', () => {
    it('closes the gate on every call but the last', () => {
      const gate = createLatestOnly()
      const first = gate.begin()
      const second = gate.begin()
      const third = gate.begin()
      expect([first(), second(), third()]).toEqual([false, false, true])
    })

    it('settles on the last call asked for, not the first to finish', async () => {
      const gate = createLatestOnly()
      const landed: string[] = []
      /** A call that takes `delay` ticks before it tries to write. */
      const call = async (name: string, delay: number): Promise<void> => {
        const isCurrent = gate.begin()
        for (let i = 0; i < delay; i++) await Promise.resolve()
        if (isCurrent()) landed.push(name)
      }
      // The older call is also the slower one — exactly the ordering that paints a stale map.
      await Promise.all([call('old', 4), call('new', 1)])
      expect(landed).toEqual(['new'])
    })

    it('gives each gate its own sequence, so two results do not cancel each other', () => {
      const bake = createLatestOnly()
      const political = createLatestOnly()
      const isBakeCurrent = bake.begin()
      political.begin()
      expect(isBakeCurrent()).toBe(true)
    })
  })

  // L3/L4: N/A — nothing is validated and nothing is thrown; the gate answers a question, it never fails.

  describe('edge cases', () => {
    it('reopens for a call started after an older one was already overtaken', () => {
      const gate = createLatestOnly()
      const first = gate.begin()
      gate.begin()
      const third = gate.begin()
      expect(first()).toBe(false)
      expect(third()).toBe(true)
    })

    it('survives far more calls than a session would ever make', () => {
      const gate = createLatestOnly()
      let isCurrent = (): boolean => false
      for (let i = 0; i < 100_000; i++) isCurrent = gate.begin()
      expect(isCurrent()).toBe(true)
    })
  })
})
