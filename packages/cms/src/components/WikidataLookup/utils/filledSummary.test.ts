import { describe, expect, it } from 'vitest'

import { filledSummary } from './filledSummary'

const AT = { year: -250, month: null, day: null, calendar: null, circa: true, margin: 50 }

describe('filledSummary', () => {
  describe('happy path', () => {
    it('lists what was filled', () => {
      const place = {
        wikidata: 'Q90',
        name: 'Paris',
        coordinates: { lon: 2, lat: 48 },
        existsFrom: AT,
        existsTo: null,
      }
      expect(filledSummary('Q90', place)).toBe(
        'Rempli depuis Q90 : l’identifiant, la position, la fondation.'
      )
    })
  })

  describe('variants', () => {
    it('adds the end when there is one', () => {
      const place = {
        wikidata: 'Q5690',
        name: null,
        coordinates: { lon: 22, lat: 37 },
        existsFrom: AT,
        existsTo: AT,
      }
      expect(filledSummary('Q5690', place)).toMatch(/la fondation, la fin\.$/)
    })
  })

  describe('managed errors', () => {
    it('says what Wikidata lacks', () => {
      const place = {
        wikidata: 'Q1',
        name: null,
        coordinates: null,
        existsFrom: null,
        existsTo: null,
      }
      expect(filledSummary('Q1', place)).toBe(
        'Rempli depuis Q1 : l’identifiant — pas de la position ni de la fondation dans Wikidata, à saisir.'
      )
    })
  })

  // L4: N/A — a pure sentence from a checked answer

  describe('edge cases', () => {
    it('does not call a missing end missing — a place may exist today', () => {
      const place = {
        wikidata: 'Q90',
        name: null,
        coordinates: { lon: 2, lat: 48 },
        existsFrom: AT,
        existsTo: null,
      }
      expect(filledSummary('Q90', place)).not.toContain('fin')
    })
  })
})
