import { describe, expect, it } from 'vitest'

import { relationBetween } from './borderRelation'

import type { YearPolity } from '../data/yearFormat'

/** An identity with nothing filled in beyond its homage. */
function polity(id: string, suzerain: string | null = null): YearPolity {
  return {
    id,
    name: id,
    rank: null,
    status: null,
    suzerain,
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: null,
  }
}

/**
 * The eleventh-century shape: France and the Empire owe nobody, Aquitaine and Normandy owe France,
 * Poitou and Saintonge owe Aquitaine, and a bishopric owes the Empire.
 */
function realm(): Map<string, YearPolity> {
  return new Map(
    [
      polity('france'),
      polity('hre'),
      polity('aquitaine', 'france'),
      polity('normandy', 'france'),
      polity('poitou', 'aquitaine'),
      polity('saintonge', 'aquitaine'),
      polity('bishopric', 'hre'),
    ].map((p) => [p.id, p])
  )
}

describe('relationBetween', () => {
  describe('happy path', () => {
    it('calls two crowns owing nobody sovereign, at full weight', () => {
      expect(relationBetween('france', 'hre', realm())).toEqual({
        relation: 'sovereign',
        degree: 0,
      })
    })

    it('calls a vassal facing its own lord a vassal, at the first degree', () => {
      expect(relationBetween('aquitaine', 'france', realm())).toEqual({
        relation: 'vassal',
        degree: 1,
      })
    })
  })

  describe('variants', () => {
    it('answers the same either way round', () => {
      expect(relationBetween('france', 'aquitaine', realm())).toEqual({
        relation: 'vassal',
        degree: 1,
      })
    })

    it('gives a rear-vassal facing its overlord the second degree', () => {
      expect(relationBetween('poitou', 'france', realm())).toEqual({
        relation: 'vassal',
        degree: 2,
      })
    })

    it('calls two co-vassals of one crown neither sovereign nor vassal', () => {
      // The finding this whole rule exists for: between two co-vassals there is no relation at all —
      // what they share is a relation to a third party. Solid would say they are sovereigns, dotted
      // would say one owes the other, and both are false.
      expect(relationBetween('aquitaine', 'normandy', realm())).toEqual({
        relation: 'co-vassal',
        degree: 1,
      })
    })

    it('puts two co-vassals one level deeper at the second degree, which is what the weight follows', () => {
      expect(relationBetween('poitou', 'saintonge', realm())).toEqual({
        relation: 'co-vassal',
        degree: 2,
      })
    })

    it('finds the lowest common suzerain, which for these two is the crown itself', () => {
      // Aquitaine is above Poitou but not above Normandy, so the first suzerain they share is France, at
      // depth 0 — the same weight as any other line drawn directly under the crown.
      expect(relationBetween('poitou', 'normandy', realm())).toEqual({
        relation: 'co-vassal',
        degree: 1,
      })
    })

    it('gives the same degree whichever polity is passed first', () => {
      // The bug this caught: counting links from one side made a border's weight depend on argument
      // order, so the same line came out at two thicknesses depending on who asked.
      const realmOf = realm()
      for (const [a, b] of [
        ['poitou', 'normandy'],
        ['poitou', 'saintonge'],
        ['aquitaine', 'normandy'],
        ['poitou', 'france'],
      ] as [string, string][])
        expect(relationBetween(a, b, realmOf)).toEqual(relationBetween(b, a, realmOf))
    })
  })

  describe('managed errors', () => {
    it('calls two vassals of DIFFERENT suzerains an ordinary border, at full weight', () => {
      // The dev's ruling, 2026-09-27: "ils ne sont pas dans le même pays donc frontière normale."
      expect(relationBetween('normandy', 'bishopric', realm())).toEqual({
        relation: 'sovereign',
        degree: 0,
      })
    })

    it('treats a polity the registry does not have as owing nobody', () => {
      expect(relationBetween('france', 'nowhere', realm())).toEqual({
        relation: 'sovereign',
        degree: 0,
      })
    })
  })

  describe('unmanaged errors', () => {
    it('terminates on a loop of homage rather than spinning', () => {
      // Refused when files are read, but a document being edited can hold one between two gestures —
      // and anything walking the chain without a guard would hang, which has no message and no stack.
      const looped = new Map([
        ['a', polity('a', 'b')],
        ['b', polity('b', 'a')],
      ])
      expect(relationBetween('a', 'b', looped).relation).toBe('vassal')
    })

    it('terminates on a polity owing itself', () => {
      const selfish = new Map([['a', polity('a', 'a')]])
      expect(() => relationBetween('a', 'b', selfish)).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('calls a polity against itself sovereign rather than anything odd', () => {
      expect(relationBetween('france', 'france', realm())).toEqual({
        relation: 'sovereign',
        degree: 0,
      })
    })

    it('reads an empty registry without complaining', () => {
      expect(relationBetween('a', 'b', new Map())).toEqual({ relation: 'sovereign', degree: 0 })
    })
  })
})
