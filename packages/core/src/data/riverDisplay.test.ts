import { describe, expect, it } from 'vitest'

import {
  LAKE_CENTERLINE_KIND,
  MAP_INK,
  RIVER_DISPLAY,
  isDrawnRiver,
  riverRankWidth,
  riverStrokeCss,
} from './riverDisplay'

describe('riverDisplay', () => {
  describe('happy path', () => {
    it('gives the major rivers the major width and the finest tributaries the minor one', () => {
      expect(riverRankWidth(1, RIVER_DISPLAY)).toBe(1.25)
      expect(riverRankWidth(9, RIVER_DISPLAY)).toBe(0.95)
    })

    it('draws the rivers in the coastline’s ink, the paths through lakes left out', () => {
      expect(RIVER_DISPLAY.ink).toBe(MAP_INK)
      expect(isDrawnRiver({ kind: 'River' }, RIVER_DISPLAY.includeLakeCenterlines)).toBe(true)
      expect(
        isDrawnRiver({ kind: LAKE_CENTERLINE_KIND }, RIVER_DISPLAY.includeLakeCenterlines)
      ).toBe(false)
    })
  })

  describe('variants', () => {
    it('interpolates the ranks between', () => {
      expect(riverRankWidth(5, RIVER_DISPLAY)).toBeCloseTo(1.1, 9)
    })

    it('keeps the paths through lakes when asked to', () => {
      expect(isDrawnRiver({ kind: LAKE_CENTERLINE_KIND }, true)).toBe(true)
    })

    it('turns the ink and the opacity into the colour a 2D canvas strokes with', () => {
      expect(riverStrokeCss({ ink: '#4a3424', opacity: 0.3 })).toBe('rgba(74, 52, 36, 0.3)')
    })
  })

  describe('managed errors', () => {
    it('refuses an ink that is not a #rrggbb hex, rather than stroking in an unchosen colour', () => {
      expect(() => riverStrokeCss({ ink: 'sepia', opacity: 0.3 })).toThrow('#rrggbb')
    })
  })

  // L4: N/A — pure arithmetic and a string match; nothing asynchronous, no collaborator.

  describe('edge cases', () => {
    it('clamps a rank outside Natural Earth’s 1–9 to the nearest end', () => {
      expect(riverRankWidth(0, RIVER_DISPLAY)).toBe(1.25)
      expect(riverRankWidth(12, RIVER_DISPLAY)).toBe(0.95)
    })
  })
})
