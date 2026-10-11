import { describe, expect, it } from 'vitest'

import { effectiveSuzerains, paintOrder, paintRanks, vassalsOf } from './paintOrder'

import type { YearPolity } from './yearFormat'

/**
 * A polity with only what the order reads: its id and its suzerain.
 * @param id - its id
 * @param suzerain - whom it owes, or `null`
 * @returns the polity
 */
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

describe('paintOrder', () => {
  describe('happy path', () => {
    // s16 — the suzerain at the back of its group, its vassals over it.
    it('paints a suzerain, then its vassals, then the next group', () => {
      const { order } = paintOrder([polity('fr'), polity('hre'), polity('normandy', 'fr')])
      expect(order).toEqual(['fr', 'normandy', 'hre'])
    })
  })

  describe('variants', () => {
    // s16 — "Then France is painted over the Empire / And Normandy … over the Empire with it".
    it('puts a vassal over the other group when its own group comes later in the list', () => {
      const { order } = paintOrder([polity('hre'), polity('fr'), polity('normandy', 'fr')])
      expect(order).toEqual(['hre', 'fr', 'normandy'])
    })

    it('ranks each polity by its place in the order, 0 at the back', () => {
      const ranks = paintRanks([polity('fr'), polity('hre'), polity('normandy', 'fr')])
      expect([...ranks]).toEqual([
        ['fr', 0],
        ['normandy', 1],
        ['hre', 2],
      ])
    })

    it('orders the vassals of one suzerain by the list', () => {
      const { order } = paintOrder([
        polity('fr'),
        polity('aquitaine', 'fr'),
        polity('normandy', 'fr'),
      ])
      expect(order).toEqual(['fr', 'aquitaine', 'normandy'])
    })

    it('walks a vassal of a vassal inside its group', () => {
      const { order } = paintOrder([
        polity('hre'),
        polity('fr'),
        polity('normandy', 'fr'),
        polity('bayeux', 'normandy'),
        polity('aquitaine', 'fr'),
      ])
      expect(order).toEqual(['hre', 'fr', 'normandy', 'bayeux', 'aquitaine'])
    })

    it('places a vassal listed before its suzerain inside the suzerain’s group', () => {
      const { order } = paintOrder([polity('normandy', 'fr'), polity('hre'), polity('fr')])
      expect(order).toEqual(['hre', 'fr', 'normandy'])
    })
  })

  describe('managed errors', () => {
    it('gives a polity whose suzerain is missing no effective suzerain', () => {
      expect([
        ...effectiveSuzerains([polity('fr'), polity('normandy', 'fr'), polity('x', 'gone')]),
      ]).toEqual([
        ['fr', null],
        ['normandy', 'fr'],
        ['x', null],
      ])
    })

    it('lets a polity whose suzerain is not in the list head its own group', () => {
      const { order, looped } = paintOrder([polity('fr'), polity('normandy', 'gone')])
      expect(order).toEqual(['fr', 'normandy'])
      expect(looped).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    // A loop of homage: the readers refuse it on load, the editor may hold one for a moment.
    it('paints the polities of a loop last, and names them, without walking for ever', () => {
      const { order, looped } = paintOrder([polity('a', 'b'), polity('b', 'a'), polity('fr')])
      expect(order).toEqual(['fr', 'a', 'b'])
      expect(looped).toEqual(['a', 'b'])
    })
  })

  describe('edge cases', () => {
    it('returns nothing for no polity', () => {
      expect(paintOrder([])).toEqual({ order: [], looped: [] })
    })

    it('paints a polity that owes itself, once', () => {
      const { order, looped } = paintOrder([polity('a', 'a')])
      expect(order).toEqual(['a'])
      expect(looped).toEqual(['a'])
    })
  })
})

describe('vassalsOf', () => {
  describe('happy path', () => {
    it('gives a polity’s vassals at any depth, itself left out', () => {
      const year = [polity('fr'), polity('nd', 'fr'), polity('bx', 'nd'), polity('hre')]
      expect([...vassalsOf(year, 'fr')].sort()).toEqual(['bx', 'nd'])
    })
  })

  describe('variants', () => {
    it('gives nothing for a polity with no vassal', () => {
      expect(vassalsOf([polity('fr'), polity('hre')], 'hre').size).toBe(0)
    })
  })

  // L3/L4: N/A — a walk over the declared suzerains.

  describe('edge cases', () => {
    it('stops on a loop already in the list', () => {
      expect([...vassalsOf([polity('a', 'b'), polity('b', 'a')], 'a')]).toEqual(['b'])
    })
  })
})
