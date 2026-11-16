import { describe, expect, it } from 'vitest'

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
