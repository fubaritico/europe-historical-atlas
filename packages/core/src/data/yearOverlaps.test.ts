import { afterEach, describe, expect, it, vi } from 'vitest'

import * as overlapsModule from './overlaps'
import { TWO_OVERLAPPING, squaresDocument } from './testing/overlapFixtures'
import { yearOverlaps } from './yearOverlaps'

// ATLAS-399: every overlap of a year at once, as the Cartographer computes them (CARTO-364).

afterEach(() => {
  vi.restoreAllMocks()
})

describe('yearOverlaps', () => {
  describe('happy path', () => {
    it('finds the band test1 and test2 share, one piece of the two', () => {
      const { pieces, refused } = yearOverlaps(squaresDocument(TWO_OVERLAPPING))
      expect([pieces.map(({ polities }) => polities), refused]).toEqual([[['test1', 'test2']], []])
    })
  })

  describe('variants', () => {
    it('cuts three polities over one ground into one piece of three', () => {
      const { pieces } = yearOverlaps(
        squaresDocument([
          ...TWO_OVERLAPPING,
          { id: 'test3', square: [0, 40, 3], colour: '#00aa00' },
        ])
      )
      expect(pieces.some(({ polities }) => polities.length === 3)).toBe(true)
    })

    it('finds nothing between a vassal and its suzerain: that is homage, not an overlap', () => {
      const { pieces } = yearOverlaps(
        squaresDocument([
          { id: 'crown', square: [0, 40, 4], colour: '#ff2000' },
          { id: 'duchy', square: [1, 41, 1], colour: '#2040ff', suzerain: 'crown' },
        ])
      )
      expect(pieces).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('leaves a pair the geometry refuses unhatched and hands it back with the reason', () => {
      vi.spyOn(overlapsModule, 'pairOverlap').mockImplementation(() => {
        throw new Error('degenerate ring')
      })
      const { pieces, refused } = yearOverlaps(squaresDocument(TWO_OVERLAPPING))
      expect([pieces, refused]).toEqual([
        [],
        [{ a: 'test1', b: 'test2', reason: 'degenerate ring' }],
      ])
    })

    it('hands back a shape the geometry refuses, its polity left out of every pair', () => {
      const real = overlapsModule.polityShape
      vi.spyOn(overlapsModule, 'polityShape').mockImplementation((document, polity) => {
        if (polity === 'test1') throw new Error('self-crossing')
        return real(document, polity)
      })
      const { pieces, refused } = yearOverlaps(squaresDocument(TWO_OVERLAPPING))
      expect([pieces, refused]).toEqual([[], [{ a: 'test1', b: null, reason: 'self-crossing' }]])
    })
  })

  describe('unmanaged errors', () => {
    it('says what was thrown even when it is not an Error', () => {
      vi.spyOn(overlapsModule, 'pairOverlap').mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- the case under test: a throw of a bare value
        throw 'a string'
      })
      expect(yearOverlaps(squaresDocument(TWO_OVERLAPPING)).refused[0]?.reason).toBe('a string')
    })
  })

  describe('edge cases', () => {
    it('finds nothing between two polities that only touch', () => {
      const { pieces } = yearOverlaps(
        squaresDocument([
          { id: 'west', square: [0, 40, 1], colour: '#ff2000' },
          { id: 'east', square: [1, 40, 1], colour: '#2040ff' },
        ])
      )
      expect(pieces).toEqual([])
    })

    it('finds nothing in a year with no polity', () => {
      expect(yearOverlaps(squaresDocument([]))).toEqual({ pieces: [], refused: [] })
    })
  })
})
