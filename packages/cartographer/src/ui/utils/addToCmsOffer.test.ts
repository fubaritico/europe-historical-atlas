import { describe, expect, it } from 'vitest'

import { addToCmsOffer } from './addToCmsOffer'

import type { WikidataView } from './wikidataView'
import type { WikidataFacts } from '../../wikidata/wikidataFacts'

/** The County of Tripoli, as Wikidata gives it. */
const TRIPOLI: WikidataFacts = {
  id: 'Q272033',
  labels: { en: 'County of Tripoli', fr: 'comté de Tripoli' },
  inception: 1102,
  dissolved: 1289,
  belongsTo: [],
  imperialState: false,
  vassalState: false,
  predecessors: [],
  successors: [],
  wikipedia: { en: null, fr: null },
  notASubject: null,
}

/**
 * Wikidata's view, Tripoli found with some facts changed.
 * @param facts - what to change
 * @returns the view
 */
function found(facts: Partial<WikidataFacts> = {}): WikidataView {
  return { kind: 'found', facts: { ...TRIPOLI, ...facts }, warning: null, suggestions: [] }
}

/** The form: a county, no years typed, no territory. */
const DRAFT = { territory: null, rank: 'county', existsFrom: '', existsTo: '' }

describe('addToCmsOffer', () => {
  describe('happy path', () => {
    it('offers Tripoli with Wikidata’s names and years', () => {
      expect(addToCmsOffer(DRAFT, found())).toEqual({
        kind: 'ready',
        territory: {
          name: 'comté de Tripoli',
          nameEn: 'County of Tripoli',
          kind: 'county',
          wikidata: 'Q272033',
          existsFrom: 1102,
          existsTo: 1289,
        },
      })
    })
  })

  describe('variants', () => {
    it('offers the page of a polity already tied', () => {
      expect(addToCmsOffer({ ...DRAFT, territory: '42' }, found())).toEqual({
        kind: 'linked',
        id: 42,
      })
    })

    it('takes the years the author typed over Wikidata’s', () => {
      const offer = addToCmsOffer({ ...DRAFT, existsFrom: '1109', existsTo: '' }, found())
      expect(
        offer.kind === 'ready' && [offer.territory.existsFrom, offer.territory.existsTo]
      ).toEqual([1109, 1289])
    })
  })

  describe('managed errors', () => {
    it.each([
      [DRAFT, { kind: 'none' }, 'noWikidata'],
      [DRAFT, found({ notASubject: 'person' }), 'notAPolity'],
      [{ ...DRAFT, rank: null }, found(), 'noRank'],
      [DRAFT, found({ labels: { en: 'County of Tripoli', fr: null } }), 'noFrenchName'],
      [DRAFT, found({ labels: { en: null, fr: 'comté de Tripoli' } }), 'noEnglishName'],
      [{ ...DRAFT, existsTo: 'vers 1289' }, found(), 'badYear'],
    ] as const)('says why not yet: %#', (draft, view, reason) => {
      expect(addToCmsOffer(draft, view)).toEqual({ kind: 'blocked', reason })
    })
  })

  // L4: N/A — pure, over values the form and Wikidata's reader already shaped

  describe('edge cases', () => {
    it('refuses a rank that is not a polity’s', () => {
      expect(addToCmsOffer({ ...DRAFT, rank: 'abbey' }, found())).toEqual({
        kind: 'blocked',
        reason: 'noRank',
      })
    })

    it('keeps no years when neither the form nor Wikidata gives any', () => {
      const offer = addToCmsOffer(DRAFT, found({ inception: null, dissolved: null }))
      expect(
        offer.kind === 'ready' && [offer.territory.existsFrom, offer.territory.existsTo]
      ).toEqual([null, null])
    })
  })
})
