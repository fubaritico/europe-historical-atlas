import { describe, expect, it } from 'vitest'

import { POLITY_RANKS } from '@europe-historical-atlas/core/data/ranks'

import { TERRITORY_KINDS, Territories } from './Territories'

import type { Field } from 'payload'

/**
 * The options of the territory's kind, as the form offers them.
 * @returns each option's value and label
 */
function kindOptions(): { value: string; label: unknown }[] {
  const field = Territories.fields.find(
    (candidate: Field) => 'name' in candidate && candidate.name === 'kind'
  )
  if (field?.type !== 'select') throw new Error('the territory has no select named kind')
  return field.options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option
  )
}

describe('Territories', () => {
  describe('happy path', () => {
    it('offers every kind of the register, in its order', () => {
      expect(kindOptions().map(({ value }) => value)).toEqual([...TERRITORY_KINDS])
    })
  })

  describe('variants', () => {
    it('offers the two ranks of a cleric’s temporal power and the patriarchate, under their French names', () => {
      const labels = new Map(kindOptions().map(({ value, label }) => [value, label]))
      expect(labels.get('episcopal_lordship')).toBe('Seigneurie épiscopale')
      expect(labels.get('archiepiscopal_lordship')).toBe('Seigneurie archiépiscopale')
      expect(labels.get('patriarchate')).toBe('Patriarcat')
    })

    it('offers the ranks of the three worlds under their French names', () => {
      const labels = new Map(kindOptions().map(({ value, label }) => [value, label]))
      expect(
        ['caliphate', 'sultanate', 'khanate', 'emirate', 'imamate', 'despotate'].map((kind) =>
          labels.get(kind)
        )
      ).toEqual(['Califat', 'Sultanat', 'Khanat', 'Émirat', 'Imamat', 'Despotat'])
    })
  })

  describe('variants — the ranks shared with the map', () => {
    it('offers every rank the Cartographer’s form offers, first and in core’s order', () => {
      expect(
        kindOptions()
          .map(({ value }) => value)
          .slice(0, POLITY_RANKS.length)
      ).toEqual([...POLITY_RANKS])
    })

    it('names the five ranks the register lacked until 2026-11-20', () => {
      const labels = new Map(kindOptions().map(({ value, label }) => [value, label]))
      expect(
        ['people', 'republic', 'confederation', 'tribe_outlined', 'distant'].map((kind) =>
          labels.get(kind)
        )
      ).toEqual([
        'Peuple',
        'République',
        'Confédération de tribus',
        'Tribu à contour',
        'Pays lointain',
      ])
    })

    it('keeps the kinds only the register holds, after the ranks', () => {
      expect(
        kindOptions()
          .map(({ value }) => value)
          .slice(POLITY_RANKS.length)
      ).toEqual(['patriarchate', 'episcopal_lordship', 'bishopric', 'abbey', 'city', 'office'])
    })
  })

  describe('edge cases', () => {
    it('keeps the bishopric, marked to be reclassed, while sheets still carry it', () => {
      expect(kindOptions().find(({ value }) => value === 'bishopric')?.label).toBe(
        'Évêché (à reclasser)'
      )
    })

    it('gives every kind a label of its own', () => {
      const labels = kindOptions().map(({ label }) => label)
      expect(new Set(labels).size).toBe(labels.length)
    })
  })

  // L3, L4: N/A — a static configuration; Payload refuses a value outside the options itself.
})
