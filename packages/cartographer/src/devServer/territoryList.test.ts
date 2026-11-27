import { describe, expect, it } from 'vitest'

import { territoriesOf } from './territoryList'

/** The Kingdom of León as Payload's REST API answers it, depth 0. */
const LEON = {
  id: 15,
  name: 'royaume de León',
  kind: 'kingdom',
  wikidata: 'Q199442',
  existsFrom: { year: 910, month: null, circa: false },
  existsTo: { year: 1230 },
  otherNames: [{ id: 'a1', language: 'en', form: ' Kingdom of León ' }],
  updatedAt: '2026-11-27T10:00:00.000Z',
}

describe('territoriesOf', () => {
  describe('happy path', () => {
    it('reads a territory into the shape the Cartographer holds', () => {
      expect(territoriesOf({ docs: [LEON] })).toEqual([
        {
          id: 15,
          name: 'royaume de León',
          wikidata: 'Q199442',
          kind: 'kingdom',
          existsFrom: 910,
          existsTo: 1230,
          names: [{ language: 'en', form: 'Kingdom of León' }],
        },
      ])
    })
  })

  describe('variants', () => {
    it('reads a territory with no Wikidata item, no dates and no other name', () => {
      const thuringia = { id: 367, name: 'Thuringe', kind: 'landgraviate', wikidata: null }

      expect(territoriesOf({ docs: [thuringia] })).toEqual([
        {
          id: 367,
          name: 'Thuringe',
          wikidata: null,
          kind: 'landgraviate',
          existsFrom: null,
          existsTo: null,
          names: [],
        },
      ])
    })

    it('reads a moment with no year as no date', () => {
      const [read] = territoriesOf({ docs: [{ ...LEON, existsTo: { year: null } }] })

      expect(read?.existsTo).toBeNull()
    })

    it('leaves out a name of an unknown language or an empty form', () => {
      const otherNames = [
        { language: 'la', form: 'Regnum Legionis' },
        { language: 'en', form: '  ' },
      ]

      expect(territoriesOf({ docs: [{ ...LEON, otherNames }] })[0]?.names).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('refuses the whole reading for a territory with no French name', () => {
      expect(() => territoriesOf({ docs: [LEON, { ...LEON, id: 16, name: '' }] })).toThrow(
        'territory 16: no French name'
      )
    })

    it('refuses the whole reading for a territory with no kind', () => {
      expect(() => territoriesOf({ docs: [{ ...LEON, kind: null }] })).toThrow(
        'territory 15: no kind'
      )
    })

    it('refuses a territory with no number', () => {
      expect(() => territoriesOf({ docs: [{ ...LEON, id: '15' }] })).toThrow(
        'a territory has no number'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('refuses an answer that holds no list', () => {
      expect(() => territoriesOf({ errors: [] })).toThrow('the answer holds no list of territories')
      expect(() => territoriesOf(null)).toThrow('the answer holds no list of territories')
    })

    it('refuses a malformed Wikidata item, naming its territory', () => {
      expect(() => territoriesOf({ docs: [{ ...LEON, wikidata: 'leon' }] })).toThrow(
        'territory 15: its Wikidata item is malformed ("leon")'
      )
    })

    it('refuses a year that is no whole number', () => {
      expect(() => territoriesOf({ docs: [{ ...LEON, existsFrom: { year: 910.5 } }] })).toThrow(
        'territory 15, exists from: its year is not a whole number (910.5)'
      )
    })
  })

  describe('edge cases', () => {
    it('reads an empty CMS as no territory', () => {
      expect(territoriesOf({ docs: [] })).toEqual([])
    })
  })
})
