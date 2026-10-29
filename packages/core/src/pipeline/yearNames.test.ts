import { describe, expect, it } from 'vitest'

import { placeYearNames, tableMeasure } from './yearNames'

import type { GlyphMetric, YearNamesRequest } from './yearNames'
import type { Region } from '../data/regionSource'

/**
 * A rectangle region, in normalized grid coordinates.
 * @param polityId - whose it is
 * @param west - its west edge, `0..1`
 * @param east - its east edge
 * @returns the region
 */
function rectangle(polityId: string, west: number, east: number): Region {
  return {
    name: polityId,
    subjectTo: null,
    partOf: null,
    polityId,
    rings: [
      [
        { u: west, v: 0.05 },
        { u: east, v: 0.05 },
        { u: east, v: 0.95 },
        { u: west, v: 0.95 },
      ],
    ],
  }
}

/** Every letter of the alphabet and the space, one unit wide, one tall; "p" reaches below. */
const GLYPHS: Record<string, GlyphMetric> = Object.fromEntries(
  Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ').map((character) => [
    character,
    {
      advance: 1,
      ascent: character === ' ' ? 0 : 1,
      descent: character === 'p' ? 0.3 : 0,
    },
  ])
)

/** A kingdom on the west half, its duke on the east half. */
const REQUEST: YearNamesRequest = {
  regions: [rectangle('king', 0.02, 0.5), rectangle('duke', 0.5, 0.98)],
  bearersByLevel: [
    ['king', 'king'],
    ['king', 'duke'],
  ],
  names: { king: 'Kingdom', duke: 'Duchy' },
  fullNames: {},
  glyphs: GLYPHS,
  gridWidth: 80,
  gridHeight: 20,
  options: {
    heightShare: 0.6,
    cover: 0.75,
    trackingMost: 0.6,
    neighbourBite: 0,
    minSize: 0.5,
    longMinSize: 0.5,
    maxSize: 1000,
    strait: 4,
    farShare: 0.2,
    farCells: 1e9,
  },
}

describe('tableMeasure', () => {
  describe('happy path', () => {
    it('reads a text’s advances from its characters', () => {
      expect(tableMeasure(GLYPHS)('Ab').advances).toEqual([1, 1])
    })
  })

  describe('variants', () => {
    it('reaches as far either side of the baseline as its furthest character', () => {
      expect(tableMeasure(GLYPHS)('Map')).toMatchObject({ ascent: 1, descent: 0.3 })
    })
  })

  describe('managed errors', () => {
    it('refuses a character the table lacks', () => {
      expect(() => tableMeasure(GLYPHS)('Ñ')).toThrow(/"Ñ" of "Ñ" was not measured/)
    })
  })

  // L4: N/A — a table lookup.

  describe('edge cases', () => {
    it('reaches nowhere for a text of spaces', () => {
      expect(tableMeasure(GLYPHS)('  ')).toMatchObject({ ascent: 0, descent: 0 })
    })
  })
})

describe('placeYearNames', () => {
  describe('happy path', () => {
    it('places the names of every level, by polity', () => {
      const { levels } = placeYearNames(REQUEST)
      expect(levels.map(({ placed }) => placed.map(({ polity }) => polity).sort())).toEqual([
        ['king'],
        ['duke', 'king'],
      ])
    })
  })

  describe('variants', () => {
    it('moves the kingdom’s name into what the shown duchy leaves it', () => {
      const { levels, gridWidth } = placeYearNames(REQUEST)
      const kingdom = levels[1]?.placed.find(({ polity }) => polity === 'king')
      expect(kingdom?.glyphs.every(({ x }) => x < gridWidth / 2)).toBe(true)
    })

    it('says which polities have no name, once, and places nothing for them', () => {
      const { levels, unnamed } = placeYearNames({ ...REQUEST, names: { king: 'Kingdom' } })
      expect(unnamed).toEqual(['duke'])
      expect(levels[1]?.placed.map(({ polity }) => polity)).toEqual(['king'])
    })

    // The dev, 2026-10-29: « Kingdom of France → France, et ça pour tout ».
    it('writes the full name where it reaches the long name’s smallest size', () => {
      const { levels } = placeYearNames({ ...REQUEST, fullNames: { king: 'Kingdom of All' } })
      expect(levels[0]?.placed.map(({ form, text }) => [form, text])).toEqual([
        ['full', 'Kingdom of All'],
      ])
    })

    it('writes the short name instead where the full one would be smaller than that', () => {
      // Forty letters in a kingdom forty cells across cannot reach 4 cells, even on two lines.
      const { levels } = placeYearNames({
        ...REQUEST,
        fullNames: { king: 'Kingdom of All the Lands and All the Seas' },
        options: { ...REQUEST.options, longMinSize: 4 },
      })
      expect(levels[0]?.placed.map(({ form, text }) => [form, text])).toEqual([
        ['short', 'Kingdom'],
      ])
    })

    it('writes one name a piece, never both forms', () => {
      const { levels } = placeYearNames({ ...REQUEST, fullNames: { king: 'Kingdom of All' } })
      expect(levels[1]?.placed.map(({ polity }) => polity).sort()).toEqual(['duke', 'king'])
    })

    it('returns the grid its places are in', () => {
      expect(placeYearNames(REQUEST)).toMatchObject({ gridWidth: 80, gridHeight: 20 })
    })
  })

  describe('managed errors', () => {
    it('lists a polity whose name fits nowhere at the smallest size', () => {
      const tight = { ...REQUEST, options: { ...REQUEST.options, minSize: 50 } }
      expect(placeYearNames(tight).levels[0]?.tooSmall).toEqual(['king'])
    })

    it('counts a polity written when its short name fits where its full one does not', () => {
      const tight = {
        ...REQUEST,
        fullNames: { king: 'Kingdom of All the Lands and All the Seas' },
        options: { ...REQUEST.options, longMinSize: 4 },
      }
      expect(placeYearNames(tight).levels[0]?.tooSmall).toEqual([])
    })

    it('refuses a level whose bearers are not one per region', () => {
      expect(() => placeYearNames({ ...REQUEST, bearersByLevel: [['king']] })).toThrow(
        /1 bearers for 2 regions/
      )
    })
  })

  describe('unmanaged errors', () => {
    it('lets a name holding a character not measured throw', () => {
      expect(() => placeYearNames({ ...REQUEST, names: { king: 'Königreich' } })).toThrow(
        /"ö" of "Königreich" was not measured/
      )
    })
  })

  describe('edge cases', () => {
    it('places nothing for a year with no level', () => {
      expect(placeYearNames({ ...REQUEST, bearersByLevel: [] }).levels).toEqual([])
    })
  })
})
