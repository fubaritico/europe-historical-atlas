import { describe, expect, it } from 'vitest'

import { homageLevels } from './homageLevels'
import { bearersByLevel, regionBearers } from './regionBearers'

/** A kingdom, its duke, and the duke's count. */
const HOMAGE = homageLevels([
  { id: 'king', suzerain: null },
  { id: 'duke', suzerain: 'king' },
  { id: 'count', suzerain: 'duke' },
])

/** The regions, in the raster's order. */
const REGIONS = ['king', 'duke', 'count']

describe('regionBearers', () => {
  describe('happy path', () => {
    it('gives every region to the polity whose colour it wears from afar', () => {
      expect(regionBearers(REGIONS, HOMAGE, 0)).toEqual(['king', 'king', 'king'])
    })
  })

  describe('variants', () => {
    it('gives the duke his own region, and his count’s, at the first level', () => {
      expect(regionBearers(REGIONS, HOMAGE, 1)).toEqual(['king', 'duke', 'duke'])
    })

    it('gives every polity its own region at the deepest level', () => {
      expect(regionBearers(REGIONS, HOMAGE, 2)).toEqual(REGIONS)
    })
  })

  // L3: N/A — it refuses nothing itself; the homage refuses an unknown polity (L4).

  describe('unmanaged errors', () => {
    it('lets a region naming no polity of the year throw from the homage', () => {
      expect(() => regionBearers(['nobody'], HOMAGE, 0)).toThrow(/nobody/)
    })
  })

  describe('edge cases', () => {
    it('reads a level past the deepest as the deepest', () => {
      expect(regionBearers(REGIONS, HOMAGE, 9)).toEqual(REGIONS)
    })
  })
})

describe('bearersByLevel', () => {
  it('lists the bearers at every level, from the sovereigns to the deepest', () => {
    expect(bearersByLevel(REGIONS, HOMAGE)).toEqual([
      ['king', 'king', 'king'],
      ['king', 'duke', 'duke'],
      ['king', 'duke', 'count'],
    ])
  })

  it('lists one level for a year of sovereigns only', () => {
    const flat = homageLevels([{ id: 'king', suzerain: null }])
    expect(bearersByLevel(['king'], flat)).toEqual([['king']])
  })
})
