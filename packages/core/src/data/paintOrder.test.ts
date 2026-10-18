import { describe, expect, it } from 'vitest'

import {
  MAX_HOMAGE_DEPTH,
  deepestVassalBelow,
  effectiveSuzerains,
  homageDepth,
  paintOrder,
  paintRanks,
  vassalsOf,
  wouldExceedHomageDepth,
} from './paintOrder'

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

/**
 * A chain of homage `c0` ← `c1` ← … ← `c<depth>`, each owing the one before.
 * @param depth - the depth of its last polity
 * @param prefix - the ids' prefix, so two chains can share a list
 * @returns the polities, top first
 */
function chain(depth: number, prefix = 'c'): YearPolity[] {
  return Array.from({ length: depth + 1 }, (_, level) =>
    polity(`${prefix}${String(level)}`, level === 0 ? null : `${prefix}${String(level - 1)}`)
  )
}

describe('homageDepth', () => {
  describe('happy path', () => {
    it('counts the suzerains above a polity', () => {
      expect(homageDepth(chain(3), 'c3')).toBe(3)
    })
  })

  describe('variants', () => {
    it('gives 0 for a polity owing nobody', () => {
      expect(homageDepth(chain(3), 'c0')).toBe(0)
    })
  })

  describe('managed errors', () => {
    it('ends the chain at a suzerain the list does not hold', () => {
      expect(homageDepth([polity('nd', 'gone')], 'nd')).toBe(0)
    })

    it('gives 0 for an id the list does not hold', () => {
      expect(homageDepth(chain(2), 'nowhere')).toBe(0)
    })
  })

  // L4: N/A — a walk over the declared suzerains, no input it cannot read.

  describe('edge cases', () => {
    it('stops on a loop already in the list', () => {
      expect(homageDepth([polity('a', 'b'), polity('b', 'a')], 'a')).toBe(1)
    })
  })
})

describe('deepestVassalBelow', () => {
  describe('happy path', () => {
    it('counts the levels of vassals below a polity', () => {
      expect(deepestVassalBelow(chain(4), 'c1')).toBe(3)
    })
  })

  describe('variants', () => {
    it('gives 0 for a polity with no vassal', () => {
      expect(deepestVassalBelow(chain(2), 'c2')).toBe(0)
    })

    it('follows the deepest branch, not the first', () => {
      const year = [polity('fr'), polity('nd', 'fr'), polity('an', 'fr'), polity('tr', 'an')]
      expect(deepestVassalBelow(year, 'fr')).toBe(2)
    })
  })

  // L3/L4: N/A — a walk over the declared suzerains.

  describe('edge cases', () => {
    it('stops on a loop already in the list', () => {
      expect(deepestVassalBelow([polity('a', 'b'), polity('b', 'a')], 'a')).toBe(1)
    })
  })
})

describe('wouldExceedHomageDepth', () => {
  describe('happy path', () => {
    it('allows a suzerain that seats the polity exactly at the limit', () => {
      const year = [...chain(MAX_HOMAGE_DEPTH - 1), polity('new')]
      expect(wouldExceedHomageDepth(year, 'new', `c${String(MAX_HOMAGE_DEPTH - 1)}`)).toBe(false)
    })

    it('refuses a suzerain that seats the polity one level past it', () => {
      const year = [...chain(MAX_HOMAGE_DEPTH), polity('new')]
      expect(wouldExceedHomageDepth(year, 'new', `c${String(MAX_HOMAGE_DEPTH)}`)).toBe(true)
    })
  })

  describe('variants', () => {
    // The trap: the polity itself stays within the limit, a vassal below it does not.
    it('refuses a suzerain that pushes a vassal below the polity past the limit', () => {
      const year = [...chain(4), ...chain(4, 'v')]
      // v0 under c4 sits at 5 — allowed alone — and drags v4 down to 9.
      expect(wouldExceedHomageDepth(year, 'v0', 'c4')).toBe(true)
    })

    it('reads a polity not created yet as having no vassal', () => {
      expect(wouldExceedHomageDepth(chain(MAX_HOMAGE_DEPTH - 1), null, 'c7')).toBe(false)
      expect(wouldExceedHomageDepth(chain(MAX_HOMAGE_DEPTH), null, 'c8')).toBe(true)
    })

    it('never refuses owing nobody', () => {
      expect(wouldExceedHomageDepth(chain(MAX_HOMAGE_DEPTH), 'c8', null)).toBe(false)
    })
  })

  // L3/L4: N/A — arithmetic over two walks that read any list.

  describe('edge cases', () => {
    it('keeps the limit at 8, the depth the atlas’s fills are sized for', () => {
      expect(MAX_HOMAGE_DEPTH).toBe(8)
    })
  })
})
