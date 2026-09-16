import { describe, expect, it } from 'vitest'

import { BORDER_STYLE_RULES, borderPatternFor } from './borderStyles'

describe('borderStyles', () => {
  describe('happy path', () => {
    it('breaks the line between two crowns held by one household', () => {
      expect(borderPatternFor('Crown of Castile', 'Crown of Aragon')).toBe('dashed')
    })

    it('draws an ordinary border solid', () => {
      expect(borderPatternFor('Kingdom of France', 'Kingdom of England')).toBe('solid')
    })
  })

  describe('variants', () => {
    it('matches the pair in either order', () => {
      // The pair comes from a raster scan, which has no notion of which side is which.
      expect(borderPatternFor('Crown of Aragon', 'Crown of Castile')).toBe(
        borderPatternFor('Crown of Castile', 'Crown of Aragon')
      )
    })

    it('ignores case, as the dataset is inconsistent about it', () => {
      expect(borderPatternFor('CASTILE', 'aragon')).toBe('dashed')
    })

    it('matches across the renamings the dataset applies from century to century', () => {
      expect(borderPatternFor('Kingdom of Castile and León', 'Aragón')).toBe('dashed')
    })

    it('recognises every union the table declares', () => {
      expect(borderPatternFor('Poland-Lithuania', 'Grand Duchy of Lithuania')).toBe('dashed')
      expect(borderPatternFor('Habsburg Monarchy', 'Kingdom of Hungary')).toBe('dashed')
      expect(borderPatternFor('Sweden', 'Norway')).toBe('dashed')
    })
  })

  describe('managed errors', () => {
    it('falls back to solid when a polity has no name', () => {
      // An unnamed polity cannot be matched, and guessing would be worse than drawing a plain line.
      expect(borderPatternFor(null, 'Crown of Aragon')).toBe('solid')
      expect(borderPatternFor('Crown of Castile', null)).toBe('solid')
    })

    it('falls back to solid when only one half of a rule matches', () => {
      expect(borderPatternFor('Crown of Castile', 'Kingdom of France')).toBe('solid')
    })
  })

  describe('unmanaged errors', () => {
    it('survives an empty name', () => {
      expect(() => borderPatternFor('', '')).not.toThrow()
    })

    // L4: N/A — a pure lookup over a literal table, with no async work and no external resource.
  })

  describe('edge cases', () => {
    it('never returns a pattern the drawing code cannot honour', () => {
      const drawable = new Set(['solid', 'dashed', 'double'])
      for (const rule of BORDER_STYLE_RULES) expect(drawable.has(rule.pattern)).toBe(true)
    })

    it('declares each rule with exactly two patterns to match', () => {
      for (const rule of BORDER_STYLE_RULES) expect(rule.between).toHaveLength(2)
    })

    it('gives every rule a label, since the table is read by people', () => {
      for (const rule of BORDER_STYLE_RULES) expect(rule.label.length).toBeGreaterThan(0)
    })

    it('does not match a polity against itself', () => {
      // A polity has no border with itself; if a rule ever claimed one it would be a table bug.
      expect(borderPatternFor('Crown of Castile', 'Crown of Castile')).toBe('solid')
    })

    it('stops firing once a union has been absorbed into one name', () => {
      // Measured on the real 1500 data: by then the dataset says `Poland-Lithuania`, a single name that
      // satisfies *both* halves of the Poland/Lithuania rule. Two fragments of that one polity must not
      // end up separated by a broken line.
      expect(borderPatternFor('Poland-Lithuania', 'Poland-Lithuania')).toBe('solid')
    })
  })
})
