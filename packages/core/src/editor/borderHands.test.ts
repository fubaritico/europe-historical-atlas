import { describe, expect, it, vi } from 'vitest'

import { RELATION_HANDS, handFor } from './borderHands'

describe('handFor', () => {
  describe('happy path', () => {
    it('draws a border between two sovereigns solid and cased', () => {
      expect(handFor({ relation: 'sovereign', hand: null })).toEqual({
        pattern: 'solid',
        cased: true,
        weight: 1,
      })
    })
  })

  describe('variants', () => {
    // The dev, 2026-10-15: a vassal's limit is dotted against its lord AND against a vassal of the same lord.
    it('draws a vassal’s limit dotted, a co-vassal’s in the same stroke, unclaimed ground uncased', () => {
      expect(handFor({ relation: 'vassal', hand: null }).pattern).toBe('dotted')
      expect(handFor({ relation: 'co-vassal', hand: null })).toEqual(
        handFor({ relation: 'vassal', hand: null })
      )
      expect(handFor({ relation: 'unclaimed', hand: null }).cased).toBe(false)
    })

    it('draws nothing on a coast — the coastline is drawn already', () => {
      expect(handFor({ relation: 'coastline', hand: null }).pattern).toBe('none')
    })

    it('lets an authored hand beat the relation’s pattern, keeping its casing and weight', () => {
      expect(handFor({ relation: 'co-vassal', hand: 'double' })).toEqual({
        ...RELATION_HANDS['co-vassal'],
        pattern: 'double',
      })
    })
  })

  describe('managed errors', () => {
    it('draws an unknown authored hand by the relation’s rule, and says so', () => {
      const warn = vi.fn()
      expect(handFor({ relation: 'sovereign', hand: 'zigzag' }, warn)).toEqual(
        RELATION_HANDS.sovereign
      )
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('zigzag'))
    })
  })

  // L4: N/A — a table lookup; the relation is a closed union the derivation produces.

  describe('edge cases', () => {
    it('honours an authored "none": the author may hide a line', () => {
      expect(handFor({ relation: 'sovereign', hand: 'none' }).pattern).toBe('none')
    })
  })
})
