import { describe, expect, it } from 'vitest'

import { pickLocale } from './locale'

describe('locale', () => {
  describe('happy path', () => {
    it('speaks French to a browser whose first language is French', () => {
      expect(pickLocale(['fr-FR', 'en'])).toBe('fr')
    })

    it('speaks English to a browser whose first language is English', () => {
      expect(pickLocale(['en-GB'])).toBe('en')
    })
  })

  describe('variants', () => {
    it.each(['fr', 'fr-CA', 'fr-BE', 'FR-fr'])('reads %s as French', (tag) => {
      expect(pickLocale([tag])).toBe('fr')
    })

    it('speaks English to any other language', () => {
      expect(pickLocale(['de-DE'])).toBe('en')
    })
  })

  // L3 (managed errors): N/A — every list has an answer; English is the rule, not a fallback.

  describe('unmanaged errors', () => {
    it('speaks English when the browser gives no language at all', () => {
      expect(pickLocale([])).toBe('en')
    })
  })

  describe('edge cases', () => {
    // The rule reads the first language only: a German reader who also reads French gets English.
    it('reads only the first preference', () => {
      expect(pickLocale(['de-DE', 'fr-FR'])).toBe('en')
    })

    // Frisian (`fy`) and Friulian (`fur`) start with an f, not with French.
    it('does not take a language that merely begins with f for French', () => {
      expect(pickLocale(['fur'])).toBe('en')
      expect(pickLocale(['fy-NL'])).toBe('en')
    })
  })
})
