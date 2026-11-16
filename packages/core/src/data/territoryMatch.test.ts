import { describe, expect, it } from 'vitest'

import { isIdentified, sameTerritory } from './territoryMatch'

describe('sameTerritory', () => {
  describe('happy path', () => {
    it('tells one territory by its Wikidata id', () => {
      expect(sameTerritory({ wikidata: 'Q1' }, { wikidata: 'Q1' })).toBe(true)
    })

    it('tells one territory by its CMS number when neither has a Wikidata id — the Thuringia of 1100', () => {
      expect(
        sameTerritory({ wikidata: null, territory: 42 }, { wikidata: null, territory: 42 })
      ).toBe(true)
    })
  })

  describe('variants', () => {
    it('falls back on the number when only one side has a Wikidata id', () => {
      expect(
        sameTerritory({ wikidata: 'Q1', territory: 42 }, { wikidata: null, territory: 42 })
      ).toBe(true)
    })

    it('tells two territories apart by their numbers', () => {
      expect(
        sameTerritory({ wikidata: null, territory: 42 }, { wikidata: null, territory: 43 })
      ).toBe(false)
    })
  })

  describe('managed errors', () => {
    // Wikidata first: two different ids are two territories, even under one number entered by mistake
    it('trusts two different Wikidata ids over a shared number', () => {
      expect(
        sameTerritory({ wikidata: 'Q1', territory: 42 }, { wikidata: 'Q2', territory: 42 })
      ).toBe(false)
    })
  })

  // L4: N/A — pure, over typed values

  describe('edge cases', () => {
    it('never tells one territory from two that carry nothing', () => {
      expect(sameTerritory({ wikidata: null }, { wikidata: null })).toBe(false)
    })

    it('never tells one territory when only one side has a number', () => {
      expect(sameTerritory({ wikidata: null, territory: 42 }, { wikidata: null })).toBe(false)
    })
  })
})

describe('isIdentified', () => {
  it.each([
    [{ wikidata: 'Q1' }, true],
    [{ wikidata: null, territory: 42 }, true],
    [{ wikidata: null }, false],
  ])('says whether %j carries an id', (ids, expected) => {
    expect(isIdentified(ids)).toBe(expected)
  })
})
