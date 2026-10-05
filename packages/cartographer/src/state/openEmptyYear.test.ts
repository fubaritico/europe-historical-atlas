import { describe, expect, it } from 'vitest'

import { EDITORIAL_ZONE, openEmptyYear } from './openEmptyYear'

describe('openEmptyYear', () => {
  describe('happy path', () => {
    it('opens the asked-for year, in the editorial zone, with nothing drawn', () => {
      const document = openEmptyYear(1100)

      expect(document.year).toBe(1100)
      expect(document.editorialZone).toEqual(EDITORIAL_ZONE)
      expect(document.anchors).toEqual([])
      expect(document.polities).toEqual([])
      expect(document.claims).toEqual([])
    })

    it('declares no provenance, rather than a source no anchor points at', () => {
      expect(openEmptyYear(1100).sources).toEqual([])
    })
  })

  describe('variants', () => {
    it('covers the span the atlas maps, one century at each end', () => {
      expect(openEmptyYear(1).year).toBe(1)
      expect(openEmptyYear(2000).year).toBe(2000)
    })

    it('holds the zone the polities of 1100 were measured against', () => {
      expect(EDITORIAL_ZONE).toEqual({ west: -45, south: 20, east: 60, north: 76 })
    })
  })

  describe('managed errors', () => {
    // L3: N/A — the function reads nothing, awaits nothing and has no failure of its own. The year is a
    // number and every number is a year somebody may draw, including a negative one.
    it('accepts a year before the era, which the atlas spans', () => {
      expect(openEmptyYear(-4000).year).toBe(-4000)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — nothing async, nothing caught.
    it('hands back a document nothing else holds, so two years cannot edit each other', () => {
      const first = openEmptyYear(1100)
      const second = openEmptyYear(1100)

      first.editorialZone.west = 0

      expect(second.editorialZone.west).toBe(-45)
      expect(EDITORIAL_ZONE.west).toBe(-45)
    })
  })

  describe('edge cases', () => {
    it('does not let an edited document write back into the shared zone', () => {
      const document = openEmptyYear(1100)

      document.editorialZone.north = 0

      expect(EDITORIAL_ZONE.north).toBe(76)
    })
  })
})
