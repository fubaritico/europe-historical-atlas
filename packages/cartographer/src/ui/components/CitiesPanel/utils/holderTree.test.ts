import { describe, expect, it } from 'vitest'

import { keysOf, treeBoxState, treeKeys } from './holderTree'

import type { MapHolderChoice } from './holderChoices'

/**
 * A polity of the map as the dialogue lists it.
 * @param id - its id, and its key `wd:<id>` unless `null` is asked
 * @param depth - its depth in the tree
 * @param withKey - whether it has a Wikidata id
 * @returns the choice
 */
function row(id: string, depth: number, withKey = true): MapHolderChoice {
  return { id, name: id, depth, colour: null, key: withKey ? `wd:${id}` : null, count: 0 }
}

/** France over Champagne (over Troyes' viscounty) and Normandy; then the Empire, alone. */
const TREE = [
  row('france', 0),
  row('champagne', 1),
  row('troyes', 2),
  row('normandy', 1),
  row('empire', 0),
]

// CARTO-388, the dev, 2026-11-08: ticking France ticks its vassals too.
describe('treeKeys', () => {
  describe('happy path', () => {
    it('gives France its own key and its whole descent: Champagne, Troyes under it, Normandy', () => {
      expect(treeKeys(TREE).get('france')).toEqual([
        'wd:france',
        'wd:champagne',
        'wd:troyes',
        'wd:normandy',
      ])
    })
  })

  describe('variants', () => {
    it('gives a vassal its own descent only: Champagne and Troyes, not Normandy', () => {
      expect(treeKeys(TREE).get('champagne')).toEqual(['wd:champagne', 'wd:troyes'])
    })

    it('gives a polity with no vassal its own key alone', () => {
      expect(treeKeys(TREE).get('empire')).toEqual(['wd:empire'])
    })
  })

  describe('edge cases', () => {
    it('leaves out the keys a polity without a Wikidata id cannot have, keeping its vassals’', () => {
      const tree = [row('france', 0, false), row('champagne', 1)]
      expect(treeKeys(tree).get('france')).toEqual(['wd:champagne'])
    })
  })

  // L3, L4: N/A — a pure walk over a list already in the tree's order.
})

describe('keysOf', () => {
  describe('happy path', () => {
    it('gives Champagne’s keys', () => {
      expect(keysOf(treeKeys(TREE), 'champagne')).toEqual(['wd:champagne', 'wd:troyes'])
    })
  })

  describe('managed errors', () => {
    it('refuses a polity the tree was not built from, rather than a box standing for nothing', () => {
      expect(() => keysOf(treeKeys(TREE), 'aquitaine')).toThrow(
        "aquitaine is not in the advanced filters' tree"
      )
    })
  })

  // L2, L4, L5: N/A — a lookup.
})

describe('treeBoxState', () => {
  const keys = ['wd:france', 'wd:champagne']

  describe('happy path', () => {
    it('is checked when France and Champagne are both ticked', () => {
      expect(treeBoxState(keys, new Set(keys))).toBe('checked')
    })
  })

  describe('variants', () => {
    it('is mixed when only France is ticked, Champagne unticked', () => {
      expect(treeBoxState(keys, new Set(['wd:france']))).toBe('mixed')
    })

    it('is unchecked when neither is', () => {
      expect(treeBoxState(keys, new Set())).toBe('unchecked')
    })
  })

  describe('edge cases', () => {
    it('is unchecked for a box that stands for no key', () => {
      expect(treeBoxState([], new Set(['wd:france']))).toBe('unchecked')
    })
  })

  // L3, L4: N/A — a count over a set.
})
