import { describe, expect, it } from 'vitest'

import { territoryProposals } from './territoryProposals'

const BLANK = { name: '', rank: null, existsFrom: '', existsTo: '' }
const JABLE = {
  id: 372,
  name: 'Jablé',
  wikidata: null,
  kind: 'emirate',
  existsFrom: 1081,
  existsTo: 1109,
}

describe('territoryProposals', () => {
  describe('happy path', () => {
    it('proposes the name, the rank and the two years of the territory to a blank form', () => {
      expect(territoryProposals(BLANK, JABLE)).toEqual([
        { field: 'name', value: 'Jablé', state: 'empty' },
        { field: 'rank', value: 'emirate', state: 'empty' },
        { field: 'existsFrom', value: '1081', state: 'empty' },
        { field: 'existsTo', value: '1109', state: 'empty' },
      ])
    })
  })

  describe('variants', () => {
    it('says a field the author filled otherwise differs, and one that agrees is the same', () => {
      const draft = { name: 'Jabala', rank: 'emirate', existsFrom: ' 1081 ', existsTo: '1110' }
      expect(territoryProposals(draft, JABLE).map(({ state }) => state)).toEqual([
        'differs',
        'same',
        'same',
        'differs',
      ])
    })

    it('proposes no rank for a kind that is none: a city, an abbey, an office', () => {
      for (const kind of ['city', 'abbey', 'office', 'bishopric']) {
        const fields = territoryProposals(BLANK, { ...JABLE, kind }).map(({ field }) => field)
        expect(fields).not.toContain('rank')
      }
    })

    it('proposes no year the CMS does not give', () => {
      const undated = { ...JABLE, existsFrom: null, existsTo: null }
      expect(territoryProposals(BLANK, undated).map(({ field }) => field)).toEqual(['name', 'rank'])
    })
  })

  describe('managed errors', () => {
    it('proposes the name alone from an export written before the kind and the years were in it', () => {
      const old = { id: 372, name: 'Jablé', wikidata: null }
      expect(territoryProposals(BLANK, old)).toEqual([
        { field: 'name', value: 'Jablé', state: 'empty' },
      ])
    })
  })

  // L4: N/A — a pure read

  describe('edge cases', () => {
    it('proposes nothing while no territory is chosen, or when the export no longer lists it', () => {
      expect(territoryProposals(BLANK, undefined)).toEqual([])
    })

    it('proposes a year before our era as the form writes it', () => {
      const old = { ...JABLE, existsFrom: -300 }
      expect(territoryProposals(BLANK, old)[2]).toEqual({
        field: 'existsFrom',
        value: '-300',
        state: 'empty',
      })
    })
  })
})
