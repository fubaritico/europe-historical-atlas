import { describe, expect, it } from 'vitest'

import { ASSET_KINDS, assetError } from '@europe-historical-atlas/core/data/assetError'
import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'
import { LOCALES } from '@europe-historical-atlas/core/i18n/locale'

import { ASSET_POLICY, assetNotice } from './assetMessages'
import { ATLAS_MESSAGES } from './messages'

import type { AssetKind } from '@europe-historical-atlas/core/data/assetError'

/**
 * Every asset family the taxonomy knows — **imported, never re-listed here.**
 *
 * This used to be a hand-written array of the same names, which drifted on 2026-09-27 the moment three
 * kinds were added: a test guarding against drift, drifting. `ASSET_KINDS` is now the source of truth and
 * `AssetKind` is derived from it, so adding a kind cannot leave this file behind.
 */
const ASSETS: readonly AssetKind[] = ASSET_KINDS

const fr = createTranslator(ATLAS_MESSAGES, 'fr')
const en = createTranslator(ATLAS_MESSAGES, 'en')

describe('ASSET_POLICY', () => {
  describe('happy path', () => {
    it('declares a policy for every asset family', () => {
      for (const asset of ASSETS)
        expect(fr(ASSET_POLICY[asset].failed, { failure: 'unknown' })).toBeTruthy()
    })
  })

  describe('variants', () => {
    it('makes the relief the only thing the map cannot do without', () => {
      // A product decision, stated once, rather than an accident of which catch someone wrote.
      const blocking = ASSETS.filter((asset) => ASSET_POLICY[asset].severity === 'blocking')
      expect(blocking).toEqual(['heightmap'])
    })

    it.each(LOCALES)(
      'says what the reader loses in %s, not merely that something failed',
      (locale) => {
        const translate = createTranslator(ATLAS_MESSAGES, locale)
        for (const asset of ASSETS)
          expect(translate(ASSET_POLICY[asset].loss).length).toBeGreaterThan(20)
      }
    )
  })

  // L3/L4: N/A — a declaration table; a missing entry fails type-check, not at runtime.

  describe('edge cases', () => {
    it('covers exactly the declared assets, with nothing left over', () => {
      expect(Object.keys(ASSET_POLICY).sort()).toEqual([...ASSETS].sort())
    })
  })
})

describe('assetNotice', () => {
  describe('happy path', () => {
    it('says what broke and what it costs, in one sentence', () => {
      const notice = assetNotice(
        'heightmap',
        assetError('heightmap', 'transport', '/heightmaps/x.json', 'HTTP 404'),
        fr
      )
      expect(notice.severity).toBe('blocking')
      expect(notice.title).toBe(
        'Le relief n’a pas pu être chargé. La carte ne peut pas être affichée.'
      )
    })

    it('says it in English to an English reader', () => {
      const notice = assetNotice('rivers', new Error('offline'), en)
      expect(notice.title).toBe('The rivers failed. The map shows without its rivers.')
    })

    it('keeps the technical half quieter, beside the sentence rather than inside it', () => {
      const notice = assetNotice(
        'rivers',
        assetError(
          'rivers',
          'schema',
          '/rivers/x.json',
          'payload.rivers[3].points[0][0] should be…'
        ),
        fr
      )
      expect(notice.detail).toContain('/rivers/x.json')
      expect(notice.detail).toContain('payload.rivers[3]')
      // Naming a field path in the headline would bury the sentence that matters.
      expect(notice.title).not.toContain('payload.rivers')
    })
  })

  describe('variants', () => {
    it('reads differently for each kind of failure', () => {
      const phrases = (['transport', 'schema', 'consistency', 'semantic'] as const).map(
        (failure) => assetNotice('rivers', assetError('rivers', failure, '/x', 'd'), fr).title
      )
      expect(new Set(phrases).size).toBe(4)
    })

    it('takes its severity from the policy, not from the failure', () => {
      // A missing river and a missing relief fail the same way and cost completely different things.
      expect(assetNotice('rivers', assetError('rivers', 'transport', '/x', 'd'), fr).severity).toBe(
        'degraded'
      )
      expect(
        assetNotice('heightmap', assetError('heightmap', 'transport', '/x', 'd'), fr).severity
      ).toBe('blocking')
    })
  })

  describe('managed errors', () => {
    it('still says something useful for a failure that is not an AssetError', () => {
      // A caller that cannot say which asset broke still has to say that something did.
      // `ont`, not `a`: this assertion used to read `toContain('a échoué')`, which is how a
      // grammatical defect reached production with a green suite — the guard agreed with the bug.
      const notice = assetNotice('rivers', new Error('offline'), fr)
      expect(notice.title).toContain('Les fleuves ont échoué')
      expect(notice.detail).toBe('offline')
    })
  })

  describe('unmanaged errors', () => {
    it('survives something thrown that is not an Error at all', () => {
      const notice = assetNotice('rivers', 'boom', fr)
      expect(notice.severity).toBe('degraded')
      expect(notice.detail).toBeUndefined()
      expect(notice.title).toBeTruthy()
    })
  })

  describe('edge cases', () => {
    it('omits the detail rather than showing an empty line', () => {
      expect(assetNotice('rivers', undefined, fr).detail).toBeUndefined()
    })
  })

  describe('French agreement', () => {
    // Found in production on 2026-09-24: the deployed atlas announced *"Les frontières historiques
    // a échoué"*. Each sentence is now written whole, per asset and per failure, by whoever translates.
    it('agrees with a feminine plural subject', () => {
      const notice = assetNotice('regions', new Error('boom'), fr)
      expect(notice.title).toContain('Les frontières historiques ont échoué')
      expect(notice.title).not.toContain('historiques a échoué')
    })

    it('agrees with a masculine plural subject', () => {
      expect(assetNotice('rivers', new Error('boom'), fr).title).toContain('Les fleuves ont échoué')
    })

    it('leaves a masculine singular subject alone', () => {
      expect(assetNotice('heightmap', new Error('boom'), fr).title).toContain('Le relief a échoué')
    })

    it('agrees the participle of a transport failure, not only the verb', () => {
      const notice = assetNotice('regions', assetError('regions', 'transport', '/x', '404'), fr)
      // `chargées`, not `chargé`: the participle follows the subject too.
      expect(notice.title).toContain('Les frontières historiques n’ont pas pu être chargées')
    })
  })
})
