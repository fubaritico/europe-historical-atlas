import { describe, expect, it } from 'vitest'

import { homageDetail, levelOpacity, levelRevealZoom } from './homageReveal'

import type { HomageRevealOptions } from './homageReveal'

const OPTIONS: HomageRevealOptions = { enabled: true, revealStart: 0.5, revealEnd: 0.8, fade: 0.2 }

describe('levelRevealZoom', () => {
  it('lands level 1 on revealStart and the deepest on revealEnd, evenly between', () => {
    expect(levelRevealZoom(1, 3, OPTIONS)).toBeCloseTo(0.5, 9)
    expect(levelRevealZoom(2, 3, OPTIONS)).toBeCloseTo(0.65, 9)
    expect(levelRevealZoom(3, 3, OPTIONS)).toBeCloseTo(0.8, 9)
  })

  it('lands the only level of a two-level year on revealStart', () => {
    expect(levelRevealZoom(1, 1, OPTIONS)).toBe(0.5)
  })
})

describe('homageDetail', () => {
  describe('happy path', () => {
    it('shows no vassal before the fade, and the direct vassals once revealStart is reached', () => {
      expect(homageDetail(0, 1, OPTIONS)).toBe(0)
      expect(homageDetail(0.3, 1, OPTIONS)).toBe(0)
      expect(homageDetail(0.5, 1, OPTIONS)).toBe(1)
      expect(homageDetail(1, 1, OPTIONS)).toBe(1)
    })

    it('ramps smoothly through the fade', () => {
      expect(homageDetail(0.4, 1, OPTIONS)).toBeCloseTo(0.5, 9)
      expect(homageDetail(0.35, 1, OPTIONS)).toBeLessThan(homageDetail(0.45, 1, OPTIONS))
    })
  })

  describe('variants', () => {
    it('climbs a level at a time in a deeper year, the deepest at revealEnd', () => {
      // A fade shorter than the 0.15 between two levels, so each level lands whole before the next starts.
      const narrow = { ...OPTIONS, fade: 0.1 }
      expect(homageDetail(0.5, 3, narrow)).toBeCloseTo(1, 9)
      expect(homageDetail(0.65, 3, narrow)).toBeCloseTo(2, 9)
      expect(homageDetail(0.8, 3, narrow)).toBeCloseTo(3, 9)
    })

    it('shows everything when switched off, whatever the zoom', () => {
      expect(homageDetail(0, 2, { ...OPTIONS, enabled: false })).toBe(2)
    })

    it('rises with the zoom', () => {
      let previous = -1
      for (let zoom = 0; zoom <= 1; zoom += 0.01) {
        const detail = homageDetail(zoom, 3, OPTIONS)
        expect(detail).toBeGreaterThanOrEqual(previous)
        previous = detail
      }
    })
  })

  // L3 (managed errors): N/A — numbers in, a number out; nothing is refused.

  describe('unmanaged errors', () => {
    it('stays a number with a zero fade', () => {
      expect(homageDetail(0.5, 1, { ...OPTIONS, fade: 0 })).toBe(1)
      expect(homageDetail(0.49, 1, { ...OPTIONS, fade: 0 })).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('answers 0 for a year with no vassal, on or off', () => {
      expect(homageDetail(1, 0, OPTIONS)).toBe(0)
      expect(homageDetail(1, 0, { ...OPTIONS, enabled: false })).toBe(0)
    })
  })
})

describe('levelOpacity', () => {
  it('shows level 0 at every detail', () => {
    expect(levelOpacity(0, 0)).toBe(1)
  })

  it('follows the share of its level the detail has reached', () => {
    expect(levelOpacity(0, 1)).toBe(0)
    expect(levelOpacity(0.5, 1)).toBe(0.5)
    expect(levelOpacity(1, 1)).toBe(1)
    expect(levelOpacity(1.25, 2)).toBe(0.25)
    expect(levelOpacity(3, 2)).toBe(1)
  })
})
