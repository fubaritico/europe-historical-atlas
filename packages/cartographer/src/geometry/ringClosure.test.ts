import { describe, expect, it } from 'vitest'

import { MIN_RING_ANCHORS, canCloseRing, isClosingOffered } from './ringClosure'

import type { Point } from '../viewport/viewport'

/** The handle radius `s02` names, and the same constant the closing gesture uses. */
const RADIUS = 8

/** Four anchors, so the first and the last are far apart — the ordinary drawing state. */
const OUTLINE: Point[] = [
  [100, 100],
  [300, 100],
  [300, 300],
  [100, 300],
]

describe('ringClosure', () => {
  describe('happy path', () => {
    it('offers to close when the pointer comes back to the first anchor', () => {
      expect(isClosingOffered(OUTLINE, [102, 99], RADIUS)).toBe(true)
    })

    it('does not offer while the pointer is out in the open', () => {
      expect(isClosingOffered(OUTLINE, [220, 180], RADIUS)).toBe(false)
    })

    it('allows a ring of three, which is the smallest shape with an interior', () => {
      expect(MIN_RING_ANCHORS).toBe(3)
      expect(canCloseRing(OUTLINE.slice(0, 3))).toBe(true)
    })
  })

  describe('variants', () => {
    it('refuses every count below three and accepts every count above', () => {
      expect(canCloseRing([])).toBe(false)
      expect(canCloseRing(OUTLINE.slice(0, 1))).toBe(false)
      expect(canCloseRing(OUTLINE.slice(0, 2))).toBe(false)
      expect(canCloseRing(OUTLINE)).toBe(true)
      expect(canCloseRing([...OUTLINE, ...OUTLINE])).toBe(true)
    })

    it('offers the gesture at any radius the caller chooses', () => {
      expect(isClosingOffered(OUTLINE, [100, 120], RADIUS)).toBe(false)
      expect(isClosingOffered(OUTLINE, [100, 120], 25)).toBe(true)
    })

    it('answers on a long outline, which is what 340 anchors look like', () => {
      const long: Point[] = [
        [100, 100],
        ...Array.from({ length: 338 }, (_, i) => [200 + i, 500] as Point),
        [100, 400],
      ]

      expect(long).toHaveLength(340)
      expect(isClosingOffered(long, [101, 101], RADIUS)).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('offers nothing on an outline with nothing in it', () => {
      expect(isClosingOffered([], [0, 0], RADIUS)).toBe(false)
    })

    it('refuses to close a two-anchor outline even with the pointer on its first anchor', () => {
      const pair = OUTLINE.slice(0, 2)

      expect(isClosingOffered(pair, [100, 100], RADIUS)).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A for async — nothing here awaits or catches. What follows is the non-finite case.
    it('offers nothing for a pointer that is not a position', () => {
      expect(isClosingOffered(OUTLINE, [Number.NaN, 100], RADIUS)).toBe(false)
    })

    it('offers nothing when the first anchor is not a position', () => {
      const broken: Point[] = [[Number.NaN, Number.NaN], ...OUTLINE.slice(1)]

      expect(isClosingOffered(broken, [100, 100], RADIUS)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('tests the FIRST anchor and not the one the pointer is next to', () => {
      // Drawing: the pointer sits beside the most recent anchor, which is the last.
      expect(isClosingOffered(OUTLINE, [101, 301], RADIUS)).toBe(false)
      expect(isClosingOffered(OUTLINE, [101, 101], RADIUS)).toBe(true)
    })

    it('would not let a two-anchor outline close on its own second click', () => {
      // The plausible version tests "the anchor under the pointer": placing a second anchor on top of
      // the first would then close a ring of two.
      const pair: Point[] = [
        [100, 100],
        [100, 100],
      ]

      expect(isClosingOffered(pair, [100, 100], RADIUS)).toBe(false)
    })

    it('offers at exactly the radius, like every other handle', () => {
      expect(isClosingOffered(OUTLINE, [108, 100], RADIUS)).toBe(true)
      expect(isClosingOffered(OUTLINE, [109, 100], RADIUS)).toBe(false)
    })

    it('does not care that the outline crosses itself — that is not this question', () => {
      const crossed: Point[] = [
        [100, 100],
        [300, 300],
        [300, 100],
        [100, 300],
      ]

      expect(isClosingOffered(crossed, [100, 100], RADIUS)).toBe(true)
    })
  })
})
