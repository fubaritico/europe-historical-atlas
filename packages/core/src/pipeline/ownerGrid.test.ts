import { describe, expect, it } from 'vitest'

import { ownerGrid } from './ownerGrid'

/** Four cells: three regions and the sea. */
const CELLS = Int16Array.from([0, 1, 2, -1])

describe('ownerGrid', () => {
  describe('happy path', () => {
    it('gives each cell the owner of its region’s bearer, the sea none', () => {
      const { owners, ids } = ownerGrid(CELLS, ['king', 'duke', 'count'])
      expect(ids).toEqual(['king', 'duke', 'count'])
      expect(Array.from(owners)).toEqual([0, 1, 2, -1])
    })
  })

  describe('variants', () => {
    it('gives one owner to the regions of one bearer', () => {
      const { owners, ids } = ownerGrid(CELLS, ['king', 'king', 'duke'])
      expect(ids).toEqual(['king', 'duke'])
      expect(Array.from(owners)).toEqual([0, 0, 1, -1])
    })
  })

  describe('managed errors', () => {
    it('refuses a cell naming a region the list does not hold', () => {
      expect(() => ownerGrid(Int16Array.from([3]), ['king', 'duke', 'count'])).toThrow(
        /region 3 of 3/
      )
    })
  })

  // L4: N/A — synchronous arithmetic over arrays it checks.

  describe('edge cases', () => {
    it('gives an empty grid no owner', () => {
      expect(ownerGrid(new Int16Array(0), ['king']).owners).toHaveLength(0)
    })

    it('lists a bearer whose regions hold no cell, though no cell is its', () => {
      expect(ownerGrid(Int16Array.from([-1]), ['king']).ids).toEqual(['king'])
    })
  })
})
