import { describe, expect, it } from 'vitest'

import { validateWikidataId } from './wikidata'

describe('validateWikidataId', () => {
  describe('happy path', () => {
    it('accepts Q and digits', () => {
      expect(validateWikidataId('Q1218')).toBe(true)
    })
  })

  describe('variants', () => {
    it('accepts an empty field', () => {
      expect(validateWikidataId('')).toBe(true)
    })

    it('accepts a missing value', () => {
      expect(validateWikidataId(null)).toBe(true)
      expect(validateWikidataId(undefined)).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('refuses a URL in place of the id', () => {
      expect(validateWikidataId('https://www.wikidata.org/wiki/Q1218')).toMatch(/^Un identifiant/)
    })
  })

  // L4: N/A — a pure check of a string, nothing can throw

  describe('edge cases', () => {
    it('refuses a lower-case q', () => {
      expect(validateWikidataId('q1218')).not.toBe(true)
    })

    it('refuses a Q with no digits', () => {
      expect(validateWikidataId('Q')).not.toBe(true)
    })
  })
})
