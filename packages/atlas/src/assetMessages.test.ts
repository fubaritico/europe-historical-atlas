import { describe, expect, it } from 'vitest'

import { assetError } from '@europe-historical-atlas/core/data/assetError'

import { ASSET_POLICY, assetNotice } from './assetMessages'

import type { AssetKind } from '@europe-historical-atlas/core/data/assetError'

/** Every asset family the taxonomy knows. */
const ASSETS: AssetKind[] = ['heightmap', 'landMask', 'regions', 'rivers']

describe('ASSET_POLICY', () => {
  describe('happy path', () => {
    it('declares a policy for every asset family', () => {
      for (const asset of ASSETS) expect(ASSET_POLICY[asset].label).toBeTruthy()
    })
  })

  describe('variants', () => {
    it('makes the relief the only thing the map cannot do without', () => {
      // A product decision, stated once, rather than an accident of which catch someone wrote.
      const blocking = ASSETS.filter((asset) => ASSET_POLICY[asset].severity === 'blocking')
      expect(blocking).toEqual(['heightmap'])
    })

    it('says what the reader loses, not merely that something failed', () => {
      for (const asset of ASSETS) expect(ASSET_POLICY[asset].consequence.length).toBeGreaterThan(20)
    })
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
        assetError('heightmap', 'transport', '/heightmaps/x.json', 'HTTP 404')
      )
      expect(notice.severity).toBe('blocking')
      expect(notice.title).toContain('relief')
      expect(notice.title).toContain('La carte ne peut pas être affichée.')
    })

    it('keeps the technical half quieter, beside the sentence rather than inside it', () => {
      const notice = assetNotice(
        'rivers',
        assetError(
          'rivers',
          'schema',
          '/rivers/x.json',
          'payload.rivers[3].points[0][0] should be…'
        )
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
        (failure) => assetNotice('rivers', assetError('rivers', failure, '/x', 'd')).title
      )
      expect(new Set(phrases).size).toBe(4)
    })

    it('takes its severity from the policy, not from the failure', () => {
      // A missing river and a missing relief fail the same way and cost completely different things.
      expect(assetNotice('rivers', assetError('rivers', 'transport', '/x', 'd')).severity).toBe(
        'degraded'
      )
      expect(
        assetNotice('heightmap', assetError('heightmap', 'transport', '/x', 'd')).severity
      ).toBe('blocking')
    })

    it('opens the sentence with a capital, though the label is lower case in the table', () => {
      expect(assetNotice('landMask', assetError('landMask', 'schema', '/x', 'd')).title[0]).toBe(
        'L'
      )
    })
  })

  describe('managed errors', () => {
    it('still says something useful for a failure that is not an AssetError', () => {
      // A caller that cannot say which asset broke still has to say that something did.
      // `ont`, not `a`: this assertion used to read `toContain('a échoué')`, which is how a
      // grammatical defect reached production with a green suite — the guard agreed with the bug.
      const notice = assetNotice('rivers', new Error('offline'))
      expect(notice.title).toContain('Les fleuves ont échoué')
      expect(notice.detail).toBe('offline')
    })
  })

  describe('unmanaged errors', () => {
    it('survives something thrown that is not an Error at all', () => {
      const notice = assetNotice('rivers', 'boom')
      expect(notice.severity).toBe('degraded')
      expect(notice.detail).toBeUndefined()
      expect(notice.title).toBeTruthy()
    })
  })

  describe('edge cases', () => {
    it('omits the detail rather than showing an empty line', () => {
      expect(assetNotice('rivers', undefined).detail).toBeUndefined()
    })
  })

  describe('French agreement', () => {
    // Found in production on 2026-09-24: the deployed atlas announced *"Les frontières historiques
    // a échoué"*. Every phrase was written in the masculine singular while half the labels are
    // plural, so the defect was systemic rather than one bad string.
    it('agrees with a feminine plural subject', () => {
      const notice = assetNotice('regions', new Error('boom'))
      expect(notice.title).toContain('Les frontières historiques ont échoué')
      expect(notice.title).not.toContain('historiques a échoué')
    })

    it('agrees with a masculine plural subject', () => {
      const notice = assetNotice('rivers', new Error('boom'))
      expect(notice.title).toContain('Les fleuves ont échoué')
    })

    it('leaves a masculine singular subject alone', () => {
      const notice = assetNotice('heightmap', new Error('boom'))
      expect(notice.title).toContain('Le relief a échoué')
    })

    it('agrees the participle of a transport failure, not only the verb', () => {
      const failed = Object.assign(new Error('404'), {
        name: 'AssetError',
        asset: 'regions',
        failure: 'transport',
      })
      const notice = assetNotice('regions', failed)
      // `chargées`, not `chargé`: the participle follows the subject too.
      expect(notice.title).toMatch(/n’ont pas pu être chargées|ont échoué/)
    })
  })

  describe('French agreement', () => {
    // Found in production on 2026-09-24: the deployed atlas announced *"Les frontières historiques
    // a échoué"*. Every phrase was written in the masculine singular while half the labels are
    // plural, so the defect was systemic rather than one bad string.
    it('agrees with a feminine plural subject', () => {
      const notice = assetNotice('regions', new Error('boom'))
      expect(notice.title).toContain('Les frontières historiques ont échoué')
      expect(notice.title).not.toContain('historiques a échoué')
    })

    it('agrees with a masculine plural subject', () => {
      const notice = assetNotice('rivers', new Error('boom'))
      expect(notice.title).toContain('Les fleuves ont échoué')
    })

    it('leaves a masculine singular subject alone', () => {
      const notice = assetNotice('heightmap', new Error('boom'))
      expect(notice.title).toContain('Le relief a échoué')
    })
  })
})
