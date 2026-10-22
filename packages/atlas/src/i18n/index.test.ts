import { describe, expect, it } from 'vitest'

import { catalogueMismatches, createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'
import { LOCALES } from '@europe-historical-atlas/core/i18n/locale'

import { ASSET_POLICY } from '../assetMessages'

import { ATLAS_MESSAGES } from '.'

/** The kinds of failure an asset message has a case for; `unknown` takes the `other` case. */
const FAILURES = ['transport', 'schema', 'consistency', 'semantic', 'unknown'] as const

describe('ATLAS_MESSAGES', () => {
  describe('happy path', () => {
    it.each(LOCALES)('reads every message in %s', (locale) => {
      expect(() => createTranslator(ATLAS_MESSAGES, locale)).not.toThrow()
    })

    it('takes the same values in French and English', () => {
      expect(catalogueMismatches(ATLAS_MESSAGES)).toEqual([])
    })
  })

  describe('variants', () => {
    it.each(LOCALES)('says each kind of failure of each asset differently in %s', (locale) => {
      const translate = createTranslator(ATLAS_MESSAGES, locale)
      for (const policy of Object.values(ASSET_POLICY)) {
        const sentences = FAILURES.map((failure) => translate(policy.failed, { failure }))
        expect(new Set(sentences).size).toBe(FAILURES.length)
      }
    })
  })

  describe('managed errors', () => {
    // The border notice once blamed invalid JSON for a file that was simply absent. An unanticipated
    // failure has, by definition, no known cause: the headline must not invent one.
    it.each(LOCALES)('never claims a cause for an unexpected error in %s', (locale) => {
      expect(createTranslator(ATLAS_MESSAGES, locale)('unexpectedError')).not.toMatch(
        /JSON|réseau|fichier|network|file/i
      )
    })
  })

  // L4 (unmanaged errors): N/A — a catalogue is data; the engine's refusals are core's tests.

  describe('edge cases', () => {
    // The one message that must always show takes no value, so building it cannot fail.
    it.each(LOCALES)('builds the unexpected-error headline with no value in %s', (locale) => {
      expect(createTranslator(ATLAS_MESSAGES, locale)('unexpectedError').length).toBeGreaterThan(20)
    })
  })
})
