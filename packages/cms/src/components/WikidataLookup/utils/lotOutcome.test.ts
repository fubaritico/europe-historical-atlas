import { describe, expect, it } from 'vitest'

import { lotOutcome } from './lotOutcome'

const ITALY = { wikidata: 'Q38', name: 'Italie' }
const SICILY = { wikidata: 'Q1460', name: 'Sicile' }

describe('lotOutcome', () => {
  describe('happy path', () => {
    it('fills a country and a region Wikidata gives one of each', () => {
      const outcome = lotOutcome({ countries: [ITALY], regions: [SICILY] })
      expect(outcome).toEqual({
        country: { kind: 'fill', item: ITALY },
        region: { kind: 'fill', item: SICILY },
        sentence: 'le pays Italie ; la région Sicile.',
      })
    })
  })

  describe('variants', () => {
    it('fills nothing and offers the list when Wikidata gives two countries', () => {
      const other = { wikidata: 'Q2', name: 'Autre' }
      const outcome = lotOutcome({ countries: [ITALY, other], regions: [] })
      expect([outcome.country, outcome.sentence]).toEqual([
        { kind: 'choose', items: [ITALY, other] },
        'le pays : plusieurs dans Wikidata, à choisir ci-dessous ; la région : absent de Wikidata, à saisir.',
      ])
    })

    it('says a region Wikidata does not give, filling nothing', () => {
      expect(lotOutcome({ countries: [ITALY], regions: [] }).region).toEqual({ kind: 'missing' })
    })
  })

  // L3–L5: N/A — a pure rule over two lists; the form's use of it is wired in useWikidataLookup.
})
