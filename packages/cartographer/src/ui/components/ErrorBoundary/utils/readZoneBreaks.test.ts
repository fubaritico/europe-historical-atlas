import { afterEach, describe, expect, it, vi } from 'vitest'

import { readZoneBreaks } from './readZoneBreaks'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('readZoneBreaks', () => {
  describe('happy path', () => {
    it('breaks the zone the address names', () => {
      expect([...readZoneBreaks('?break=polities-panel')]).toEqual(['polities-panel'])
    })

    it('breaks nothing when the address names nothing', () => {
      expect(readZoneBreaks('').size).toBe(0)
    })
  })

  describe('variants', () => {
    it('breaks several zones separated by commas', () => {
      expect([...readZoneBreaks('?break=map,status-bar')]).toEqual(['map', 'status-bar'])
    })

    it('breaks several zones from a repeated parameter', () => {
      expect([...readZoneBreaks('?break=map&break=dock')]).toEqual(['map', 'dock'])
    })

    it('leaves the other parameters of the address alone', () => {
      expect([...readZoneBreaks('?year=1100&break=tool-rail')]).toEqual(['tool-rail'])
    })
  })

  describe('managed errors', () => {
    it('leaves out a name that is no zone, and says so with the zones there are', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      expect([...readZoneBreaks('?break=polities,map')]).toEqual(['map'])
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]?.[0]).toContain('?break=polities names no zone')
      expect(warn.mock.calls[0]?.[0]).toContain('polities-panel')
    })

    it('does not match a zone by another case', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      expect(readZoneBreaks('?break=MAP').size).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    it('reads a malformed escape without throwing, as a name that is no zone', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      expect(readZoneBreaks('?break=%E0%A4%A').size).toBe(0)
      expect(warn).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('ignores empty names and the spaces around a name', () => {
      expect([...readZoneBreaks('?break=,%20map%20,,')]).toEqual(['map'])
    })

    it('names a zone once however often the address repeats it', () => {
      expect([...readZoneBreaks('?break=map,map&break=map')]).toEqual(['map'])
    })

    it('breaks nothing for a parameter left empty', () => {
      expect(readZoneBreaks('?break=').size).toBe(0)
    })
  })
})
