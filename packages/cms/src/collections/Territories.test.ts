import { describe, expect, it } from 'vitest'

import { POLITY_RANKS } from '@europe-historical-atlas/core/data/ranks'

import { validateOtherNames } from '../fields/nameForms'

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

/**
 * The table's field, as the form offers it.
 * @returns the field
 */
function otherNames() {
  const field = Territories.fields.find(
    (candidate: Field) => 'name' in candidate && candidate.name === 'otherNames'
  )
  if (field?.type !== 'array') throw new Error('the territory has no table named otherNames')
  return field
}

describe('Territories', () => {
  describe('happy path', () => {
    it('offers every kind of the register, in its order', () => {
      expect(kindOptions().map(({ value }) => value)).toEqual([...TERRITORY_KINDS])
    })
  })

  // CMS-495: one name a language — the French one is the field « Nom », the others stand in a table under it.
  describe('the names in the other languages', () => {
    it('is a table of a language and a form, checked by the rule of the names', () => {
      const field = otherNames()
      expect(field.fields.map((inner) => ('name' in inner ? inner.name : ''))).toEqual([
        'language',
        'form',
      ])
      expect(field.validate).toBe(validateOtherNames)
    })

    it('offers every language but French', () => {
      const [language] = otherNames().fields
      if (language?.type !== 'select') throw new Error('the table has no select for the language')
      expect(language.options).toEqual([
        { value: 'en', label: 'Anglais' },
        { value: 'es', label: 'Espagnol' },
        { value: 'it', label: 'Italien' },
        { value: 'de', label: 'Allemand' },
      ])
    })

    it('accepts no line, and one line a language', () => {
      expect(validateOtherNames(undefined)).toBe(true)
      expect(
        validateOtherNames([
          { language: 'en', form: 'County of Champagne' },
          { language: 'de', form: 'Grafschaft Champagne' },
        ])
      ).toBe(true)
    })

    it('refuses French, which is the field « Nom », and a language written twice', () => {
      expect(validateOtherNames([{ language: 'fr', form: 'comté de Champagne' }])).toContain(
        'Le nom français est le champ « Nom »'
      )
      expect(
        validateOtherNames([
          { language: 'en', form: 'County of Champagne' },
          { language: 'en', form: 'Champagne' },
        ])
      ).toContain('« Anglais » est saisie deux fois')
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
