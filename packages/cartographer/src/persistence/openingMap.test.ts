import { describe, expect, it } from 'vitest'

import { addressForMap, openingMapOf } from './openingMap'

describe('openingMapOf', () => {
  describe('happy path', () => {
    it('opens the map the address names', () => {
      expect(openingMapOf('?map=1100-backup-2026-11-02', '1100')).toBe('1100-backup-2026-11-02')
    })
  })

  describe('variants', () => {
    it('opens the first map when the address names none', () => {
      expect([openingMapOf('', '1100'), openingMapOf('?other=1', '1100')]).toEqual(['1100', '1100'])
    })

    it('reads a query written without its question mark', () => {
      expect(openingMapOf('map=1200', '1100')).toBe('1200')
    })
  })

  describe('managed errors', () => {
    it('refuses a name that cannot be a map’s, saying what it read', () => {
      expect(() => openingMapOf('?map=..%2Fsecret', '1100')).toThrow('« ../secret »')
    })
  })

  // L4: N/A — a pure reading of a string.

  describe('edge cases', () => {
    it('refuses an empty name rather than opening the first map in its place', () => {
      expect(() => openingMapOf('?map=', '1100')).toThrow('cannot be a map')
    })
  })
})

describe('addressForMap', () => {
  it('names the map and keeps the rest of the query', () => {
    expect(addressForMap('?debug=1', '1200')).toBe('?debug=1&map=1200')
  })

  it('replaces the map named before', () => {
    expect(addressForMap('?map=1100', '1100-essai')).toBe('?map=1100-essai')
  })

  it('drops the year an older address named', () => {
    expect(addressForMap('?year=1200', '1200')).toBe('?map=1200')
  })
})
