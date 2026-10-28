import { describe, expect, it } from 'vitest'

import { breakInTwo } from './nameBreak'

/**
 * One advance per code point, all equal.
 * @param text - the name
 * @returns its advances
 */
const even = (text: string): number[] => Array.from(text, () => 1)

describe('breakInTwo', () => {
  describe('happy path', () => {
    it('breaks a two-word name at its space', () => {
      expect(breakInTwo('Upper Lorraine', even('Upper Lorraine'))).toEqual({
        at: 5,
        first: 5,
        second: 8,
      })
    })
  })

  describe('variants', () => {
    it('breaks at the space that makes the two lines most even', () => {
      // "Kingdom of" (10) / "the Almoravids" (14) against "Kingdom of the" (14) / "Almoravids" (10): a tie on the
      // longest line, the first found kept.
      const text = 'Kingdom of the Almoravids'
      expect(breakInTwo(text, even(text))?.at).toBe(10)
    })

    it('weighs the letters by their advances, not by their count', () => {
      // "WW i iii": by count the second space evens it (4 / 3); by width, the first does (6 / 3 against 7.5 / 1.5).
      const text = 'WW i iii'
      const advances = [3, 3, 1, 0.5, 1, 0.5, 0.5, 0.5]
      expect(breakInTwo(text, advances)?.at).toBe(2)
    })
  })

  describe('managed errors', () => {
    it('does not break a name of one word', () => {
      expect(breakInTwo('Norway', even('Norway'))).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('refuses advances that are not one per code point', () => {
      expect(() => breakInTwo('Upper Lorraine', [1, 1])).toThrow(/14 letters and 2 advances/)
    })
  })

  describe('edge cases', () => {
    it('breaks a doubled space nowhere, and a single one elsewhere in the name', () => {
      const text = 'Aa  Bb Cc'
      expect(breakInTwo(text, even(text))?.at).toBe(6)
      expect(breakInTwo('Aa  Bb', even('Aa  Bb'))).toBeNull()
    })

    it('does not break at a space at either end', () => {
      expect(breakInTwo(' Norway ', even(' Norway '))).toBeNull()
    })

    it('counts a letter outside the basic plane as one code point', () => {
      const text = '𝔄 Rus'
      expect(breakInTwo(text, even(text))?.at).toBe(1)
    })
  })
})
