import { describe, expect, it } from 'vitest'

import {
  NAME_LANGUAGES,
  formIn,
  isNameLanguage,
  periodNameLabel,
  repeatedLanguage,
} from './periodName'

import type { NameForm } from './periodName'

const ANCYRA: NameForm[] = [
  { language: 'en', form: 'Ancyra' },
  { language: 'fr', form: 'Ancyre' },
]

describe('periodName', () => {
  describe('happy path', () => {
    it('labels a name by its forms, French first whatever the order typed', () => {
      expect(periodNameLabel(ANCYRA)).toBe('Ancyre · Ancyra')
    })

    it('gives the form of a language', () => {
      expect(formIn(ANCYRA, 'fr')).toBe('Ancyre')
      expect(formIn(ANCYRA, 'en')).toBe('Ancyra')
    })

    it('finds no language repeated in a table with one line a language', () => {
      expect(repeatedLanguage(ANCYRA)).toBeNull()
    })
  })

  describe('variants', () => {
    it('says once a form two languages share', () => {
      expect(
        periodNameLabel([
          { language: 'fr', form: 'Constantinople' },
          { language: 'en', form: 'Constantinople' },
          { language: 'de', form: 'Konstantinopel' },
        ])
      ).toBe('Constantinople · Konstantinopel')
    })

    it('knows French, English, Spanish, Italian and German', () => {
      expect(NAME_LANGUAGES).toEqual(['fr', 'en', 'es', 'it', 'de'])
      expect(NAME_LANGUAGES.every(isNameLanguage)).toBe(true)
    })
  })

  // L3–L4: N/A — pure functions over a typed table; a repeated language and a missing one are answers, said below.
  describe('edge cases', () => {
    it('labels a table with no form by an empty text', () => {
      expect(periodNameLabel([])).toBe('')
    })

    it('gives null for a language the table has no line for', () => {
      expect(formIn(ANCYRA, 'de')).toBeNull()
    })

    it('names the language written twice', () => {
      expect(repeatedLanguage([...ANCYRA, { language: 'fr', form: 'Ankyra' }])).toBe('fr')
    })

    it('refuses a language outside the list, and what is not a text', () => {
      expect(isNameLanguage('tlh')).toBe(false)
      expect(isNameLanguage(undefined)).toBe(false)
    })
  })
})
