import { describe, expect, it } from 'vitest'

import { homageLevels } from './homageLevels'
import { nameOwners } from './nameOwners'

/** A kingdom, its duke, and the duke's count. */
const HOMAGE = homageLevels([
  { id: 'king', suzerain: null },
  { id: 'duke', suzerain: 'king' },
  { id: 'count', suzerain: 'duke' },
])

/** Four cells: the king's, the duke's, the count's, and the sea. */
const CELLS = Int16Array.from([0, 1, 2, -1])

/** The regions, in the raster's order. */
const REGIONS = ['king', 'duke', 'count']

describe('nameOwners', () => {
  describe('happy path', () => {
    it('gives every cell to the polity whose colour it wears from afar', () => {
      const { owners, ids } = nameOwners(CELLS, REGIONS, HOMAGE, 0)
      expect(ids).toEqual(['king'])
      expect(Array.from(owners)).toEqual([0, 0, 0, -1])
    })
  })

  describe('variants', () => {
    it('gives the duke his own cells, and his count’s, at the first level', () => {
      const { owners, ids } = nameOwners(CELLS, REGIONS, HOMAGE, 1)
      expect(ids).toEqual(['king', 'duke'])
      expect(Array.from(owners)).toEqual([0, 1, 1, -1])
    })

    it('gives every polity its own cells at the deepest level', () => {
      const { owners, ids } = nameOwners(CELLS, REGIONS, HOMAGE, 2)
      expect(ids).toEqual(['king', 'duke', 'count'])
      expect(Array.from(owners)).toEqual([0, 1, 2, -1])
    })

    it('gives one owner to two regions of one polity', () => {
      const { owners, ids } = nameOwners(Int16Array.from([0, 1]), ['king', 'king'], HOMAGE, 2)
      expect(ids).toEqual(['king'])
      expect(Array.from(owners)).toEqual([0, 0])
    })
  })

  describe('managed errors', () => {
    it('refuses a cell naming a region the list does not hold', () => {
      expect(() => nameOwners(Int16Array.from([3]), REGIONS, HOMAGE, 0)).toThrow(/region 3 of 3/)
    })
  })

  describe('unmanaged errors', () => {
    it('lets a region naming no polity of the year throw from the homage', () => {
      expect(() => nameOwners(Int16Array.from([0]), ['nobody'], HOMAGE, 0)).toThrow(/nobody/)
    })
  })

  describe('edge cases', () => {
    it('gives an empty grid no owner', () => {
      expect(nameOwners(new Int16Array(0), REGIONS, HOMAGE, 0).owners).toHaveLength(0)
    })

    it('reads a level past the deepest as the deepest', () => {
      expect(nameOwners(CELLS, REGIONS, HOMAGE, 9).ids).toEqual(['king', 'duke', 'count'])
    })
  })
})
