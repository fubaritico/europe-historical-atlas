import { describe, expect, it } from 'vitest'

import { deploymentModeOf } from './deploymentMode'

describe('deploymentModeOf', () => {
  describe('happy path', () => {
    it('is offline on localhost', () => {
      expect(deploymentModeOf('localhost')).toBe('offline')
    })
  })

  describe('variants', () => {
    it.each(['127.0.0.1', '[::1]'])('is offline on %s', (hostname) => {
      expect(deploymentModeOf(hostname)).toBe('offline')
    })

    it('is online on the site', () => {
      expect(deploymentModeOf('europe-historical-atlas.netlify.app')).toBe('online')
    })
  })

  // L3, L4: N/A — any string is a host name, and none is refused

  describe('edge cases', () => {
    it('is online on a name that only begins like this machine', () => {
      expect(deploymentModeOf('localhost.example.com')).toBe('online')
    })

    it('is online on another address of the local network', () => {
      expect(deploymentModeOf('192.168.1.10')).toBe('online')
    })
  })
})
