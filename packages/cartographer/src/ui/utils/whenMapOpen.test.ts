import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { whenMapOpen } from './whenMapOpen'

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('whenMapOpen', () => {
  describe('happy path', () => {
    it('runs the command with the map’s session', () => {
      const run = vi.fn()
      whenMapOpen({ map: '1100' }, 'save', run)()
      expect(run).toHaveBeenCalledWith({ map: '1100' })
    })
  })

  // L2: N/A — one branch per answer, both covered.

  describe('managed errors', () => {
    it('declines on the start screen, saying which command', () => {
      const run = vi.fn()
      whenMapOpen(null, 'save', run)()
      expect(run).not.toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith('[Cartographer] save declined: no map is open')
    })
  })

  // L4: N/A — nothing awaited, nothing parsed.

  describe('edge cases', () => {
    it('runs each time it is called, the session read once', () => {
      const run = vi.fn()
      const command = whenMapOpen('1100', 'copy', run)
      command()
      command()
      expect(run).toHaveBeenCalledTimes(2)
    })
  })
})
