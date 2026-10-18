import { describe, expect, it } from 'vitest'

import { openEmptyYear } from './openEmptyYear'

describe('openEmptyYear', () => {
  describe('happy path', () => {
    it('opens the asked-for year with nothing drawn', () => {
      const document = openEmptyYear(1100)

      expect(document.year).toBe(1100)
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

      first.anchors.push([0, 0])

      expect(second.anchors).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('opens year zero, which the calendar skips but a number may hold', () => {
      expect(openEmptyYear(0).year).toBe(0)
    })
  })
})
