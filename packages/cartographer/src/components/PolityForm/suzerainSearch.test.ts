import { describe, expect, it } from 'vitest'

import { MAX_SUGGESTIONS, foldForSearch, matchingOptions } from './suzerainSearch'

/** A few polities of 1100, in the list's own order. */
const OPTIONS = [
  { value: 'denmark', label: 'Kingdom of Denmark' },
  { value: 'norway', label: 'Kingdom of Norway' },
  { value: 'normandy', label: 'Duchy of Normandy' },
  { value: 'idf', label: 'Île-de-France' },
  { value: 'novgorod', label: 'Republic of Novgorod' },
]

/** The values of a list of options. */
const values = (options: readonly { value: string }[]) => options.map((option) => option.value)

describe('matchingOptions', () => {
  describe('happy path', () => {
    it('offers the polities whose name contains what was typed', () => {
      expect(values(matchingOptions(OPTIONS, 'nor', MAX_SUGGESTIONS))).toEqual([
        'norway',
        'normandy',
      ])
    })
  })

  describe('variants', () => {
    it('puts the names that start with the query before those that only contain it', () => {
      // Republic of Novgorod is last in the list but the only name starting with r: it comes first.
      expect(values(matchingOptions(OPTIONS, 'r', MAX_SUGGESTIONS))[0]).toBe('novgorod')
    })

    it('ignores case and accents, both ways', () => {
      expect(values(matchingOptions(OPTIONS, 'ILE', MAX_SUGGESTIONS))).toEqual(['idf'])
      expect(values(matchingOptions(OPTIONS, 'île', MAX_SUGGESTIONS))).toEqual(['idf'])
    })

    it('ignores the spaces around the query', () => {
      expect(values(matchingOptions(OPTIONS, '  norway ', MAX_SUGGESTIONS))).toEqual(['norway'])
    })
  })

  // L3/L4: N/A — a pure filter over strings; nothing is refused, nothing is thrown.

  describe('edge cases', () => {
    it('offers nothing for a blank query', () => {
      expect(matchingOptions(OPTIONS, '   ', MAX_SUGGESTIONS)).toEqual([])
    })

    it('offers nothing when no name matches', () => {
      expect(matchingOptions(OPTIONS, 'xyz', MAX_SUGGESTIONS)).toEqual([])
    })

    it('stops at the limit', () => {
      const many = Array.from({ length: 50 }, (_, i) => ({
        value: `p${String(i)}`,
        label: `Polity ${String(i)}`,
      }))

      expect(matchingOptions(many, 'polity', MAX_SUGGESTIONS)).toHaveLength(MAX_SUGGESTIONS)
    })
  })
})

describe('foldForSearch', () => {
  it('lowers the case and drops the accents', () => {
    expect(foldForSearch('Île-de-France — Çà')).toBe('ile-de-france — ca')
  })
})
