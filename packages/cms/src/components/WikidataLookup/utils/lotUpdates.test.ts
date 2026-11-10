import { describe, expect, it } from 'vitest'

import { lotOutcome } from './lotOutcome'
import { lotFieldUpdates, lotUpdates } from './lotUpdates'

const ITALY = { wikidata: 'Q38', name: 'Italie' }
const SICILY = { wikidata: 'Q1460', name: 'Sicile' }
const OTHER = { wikidata: 'Q2', name: 'Autre' }

describe('lotUpdates', () => {
  describe('happy path', () => {
    it('writes the country and the region Wikidata gives one of each, into the fields’ paths', () => {
      expect(lotUpdates(lotOutcome({ countries: [ITALY], regions: [SICILY] }))).toEqual({
        updates: [
          { path: 'country.name', value: 'Italie' },
          { path: 'country.wikidata', value: 'Q38' },
          { path: 'region.name', value: 'Sicile' },
          { path: 'region.wikidata', value: 'Q1460' },
        ],
        choices: {},
      })
    })
  })

  describe('variants', () => {
    it('clears a field Wikidata gives several of, and offers them', () => {
      const { updates, choices } = lotUpdates(
        lotOutcome({ countries: [ITALY, OTHER], regions: [SICILY] })
      )
      expect([updates.slice(0, 2), choices]).toEqual([
        [
          { path: 'country.name', value: '' },
          { path: 'country.wikidata', value: '' },
        ],
        { country: [ITALY, OTHER] },
      ])
    })

    it('clears a field Wikidata gives none of — a country left from an item chosen before goes', () => {
      const { updates } = lotUpdates(lotOutcome({ countries: [ITALY], regions: [] }))
      expect(updates.slice(2)).toEqual([
        { path: 'region.name', value: '' },
        { path: 'region.wikidata', value: '' },
      ])
    })

    it('writes one item chosen from a list into its field', () => {
      expect(lotFieldUpdates('region', SICILY)).toEqual([
        { path: 'region.name', value: 'Sicile' },
        { path: 'region.wikidata', value: 'Q1460' },
      ])
    })
  })

  // L3–L5: N/A — a pure mapping of an outcome already checked by lotOutcome's tests.
})
