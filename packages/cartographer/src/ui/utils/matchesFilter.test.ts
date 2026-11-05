import { describe, expect, it } from 'vitest'

import { matchesFilter } from './matchesFilter'

describe('matchesFilter', () => {
  describe('happy path', () => {
    it('finds a name holding the query', () => {
      expect(matchesFilter('Royaume de France', 'France')).toBe(true)
    })

    it('refuses a name not holding it', () => {
      expect(matchesFilter('Royaume de France', 'Pologne')).toBe(false)
    })
  })

  describe('variants', () => {
    it('ignores the case', () => {
      expect(matchesFilter('Kiev', 'kIEV')).toBe(true)
    })

    it('ignores the accents on either side', () => {
      expect(matchesFilter('Bohême', 'boheme')).toBe(true)
      expect(matchesFilter('Boheme', 'bohême')).toBe(true)
    })

    it('finds a name whose letters keep their mark in their shape', () => {
      expect(matchesFilter('Łódź', 'lodz')).toBe(true)
      expect(matchesFilter('Roskilde Stift, Ærø', 'aero')).toBe(true)
      expect(matchesFilter('Großwardein', 'grossw')).toBe(true)
      expect(matchesFilter('Đakovo', 'dak')).toBe(true)
    })

    it('finds the query in the middle of a word', () => {
      expect(matchesFilter('Saint-Empire', 'emp')).toBe(true)
    })

    it('trims the spaces around the query', () => {
      expect(matchesFilter('Kiev', '  kiev ')).toBe(true)
    })
  })

  // L3–L4: N/A — two strings in, a boolean out; nothing can fail.

  describe('edge cases', () => {
    it('lets every name through an empty query, or one of spaces only', () => {
      expect(matchesFilter('Kiev', '')).toBe(true)
      expect(matchesFilter('Kiev', '   ')).toBe(true)
    })

    it('keeps the spaces inside the query', () => {
      expect(matchesFilter('Royaume de France', 'de fr')).toBe(true)
      expect(matchesFilter('Royaume de France', 'def')).toBe(false)
    })

    it('finds a Greek name typed without its capital and its breathing mark', () => {
      expect(matchesFilter('Ἀντιόχεια', 'αντ')).toBe(true)
    })
  })
})
