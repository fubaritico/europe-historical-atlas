import { describe, expect, it, vi } from 'vitest'

import { cmsChannelOf } from './cmsChannel'

describe('cmsChannelOf', () => {
  describe('happy path', () => {
    it('reaches the CMS through the dev server on this machine', () => {
      const sessionLost = vi.fn()
      const report = vi.fn()
      const channel = cmsChannelOf('localhost', {
        route: '/__cms/territories',
        sessionLost,
        report,
      })
      expect(channel.mode).toBe('offline')
      expect(channel.mode === 'offline' && channel.pageOf(512)).toBe(
        'http://localhost:3100/admin/collections/territories/512'
      )
      if (channel.mode === 'offline') channel.sessionLost()
      expect(sessionLost).toHaveBeenCalledTimes(1)
      const notice = { tone: 'alarm', topic: 'cms', text: 'x' } as const
      if (channel.mode === 'offline') channel.report(notice)
      expect(report).toHaveBeenCalledWith(notice)
    })
  })

  describe('variants', () => {
    it('writes no CMS online', () => {
      expect(
        cmsChannelOf('europe-historical-atlas.netlify.app', {
          route: '/__cms/territories',
          sessionLost: vi.fn(),
          report: vi.fn(),
        })
      ).toEqual({
        mode: 'online',
      })
    })
  })

  // L3, L4: N/A — every host name is one of the two
  // L5: the host names at the edge are deploymentModeOf's, tested there
})
