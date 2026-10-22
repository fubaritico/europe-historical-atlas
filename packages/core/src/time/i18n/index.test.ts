import { describe, expect, it } from 'vitest'

import { catalogueMismatches, createTranslator } from '../../i18n/catalogue'
import { LOCALES } from '../../i18n/locale'

import { DATE_MESSAGES, MONTH_KEYS } from '.'

describe('dateMessages', () => {
  describe('happy path', () => {
    it.each(LOCALES)('reads every message in %s', (locale) => {
      expect(() => createTranslator(DATE_MESSAGES, locale)).not.toThrow()
    })

    it('takes the same values in French and English', () => {
      expect(catalogueMismatches(DATE_MESSAGES)).toEqual([])
    })
  })

  describe('variants', () => {
    it('holds twelve months', () => {
      expect(MONTH_KEYS).toHaveLength(12)
    })
  })

  // L3 (managed errors), L4 (unmanaged errors): N/A — a catalogue is data; the engine's refusals are
  // messageFormat.test.ts' and catalogue.test.ts'.

  describe('edge cases', () => {
    it('names no month twice in either language', () => {
      for (const locale of LOCALES) {
        const names = MONTH_KEYS.map((key) => DATE_MESSAGES[locale][key])
        expect(new Set(names).size).toBe(12)
      }
    })
  })
})
