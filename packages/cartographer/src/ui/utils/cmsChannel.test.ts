import { describe, expect, it, vi } from 'vitest'

import { cmsChannelOf } from './cmsChannel'

describe('cmsChannelOf', () => {
  describe('happy path', () => {
    it('reaches the CMS through the dev server on this machine', () => {
      const sessionLost = vi.fn()
      const channel = cmsChannelOf('localhost', '/__cms/territories', sessionLost)
      expect(channel.mode).toBe('offline')
      expect(channel.mode === 'offline' && channel.pageOf(512)).toBe(
        'http://localhost:3100/admin/collections/territories/512'
      )
      if (channel.mode === 'offline') channel.sessionLost()
      expect(sessionLost).toHaveBeenCalledTimes(1)
    })
  })

  describe('variants', () => {
    it('writes no CMS online', () => {
      expect(
        cmsChannelOf('europe-historical-atlas.netlify.app', '/__cms/territories', vi.fn())
      ).toEqual({
        mode: 'online',
      })
    })
  })

  // L3, L4: N/A — every host name is one of the two
  // L5: the host names at the edge are deploymentModeOf's, tested there
})
