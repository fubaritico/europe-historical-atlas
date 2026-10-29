import { describe, expect, it } from 'vitest'

import { createOccupancy, occupy, pieceTag, withOccupied } from './nameOccupancy'
import { COVERED } from './nameSpace'
import { piecesOf } from './testing/pieces'

import type { MarkedName } from './nameOccupancy'

/**
 * A name of one letter one unit wide and one tall, set straight at a place.
 * @param text - the name
 * @param x - its first letter's column
 * @param y - its baseline's row
 * @returns the name, its letters one unit apart
 */
function marked(text: string, x: number, y: number): MarkedName {
  return {
    text,
    advances: Array.from(text, () => 1),
    ascent: 1,
    descent: 0,
    size: 2,
    glyphs: Array.from(text, (_, at) => ({ x: x + 2 * at, y, angle: 0 })),
  }
}

/**
 * The cells an occupancy marks with a tag.
 * @param cells - the occupancy's cells
 * @param tag - the tag
 * @returns how many
 */
const count = (cells: Float64Array, tag: number): number => cells.filter((c) => c === tag).length

describe('pieceTag', () => {
  it('gives every piece of every owner its own tag, never the nought that stands for none', () => {
    const tags = [pieceTag(0, 0), pieceTag(0, 1), pieceTag(1, 0), pieceTag(1, 1)]
    expect(new Set(tags).size).toBe(4)
    expect(tags).not.toContain(0)
  })
})

describe('occupy', () => {
  describe('happy path', () => {
    it('marks the cells under a letter and its white edge with the piece’s tag', () => {
      const occupancy = createOccupancy(20, 20)
      occupy(occupancy, 7, marked('A', 10, 10))
      // A letter of size 2: two cells wide, two tall above its baseline, and half a cell of edge around.
      expect(occupancy.cells[10 * 20 + 10]).toBe(7)
      expect(occupancy.cells[8 * 20 + 10]).toBe(7)
      expect(occupancy.cells[10 * 20 + 14]).toBe(0)
      expect(count(occupancy.cells, 7)).toBeGreaterThan(9)
    })
  })

  describe('variants', () => {
    it('marks nothing for a space, which draws nothing', () => {
      const occupancy = createOccupancy(20, 20)
      const glyphs = [4, 10, 16].map((x) => ({ x, y: 10, angle: 0 }))
      occupy(occupancy, 3, { ...marked('A A', 4, 10), glyphs })
      // The middle place, the space's, stands at column 10: the letters either side leave it unmarked.
      expect(occupancy.cells[10 * 20 + 10]).toBe(0)
      expect(occupancy.cells[10 * 20 + 16]).toBe(3)
    })
  })

  // L3, L4: N/A — it writes a grid it was handed, and refuses nothing.

  describe('edge cases', () => {
    it('leaves out the cells past the grid', () => {
      const occupancy = createOccupancy(4, 4)
      expect(() => {
        occupy(occupancy, 1, marked('A', 0, 0))
      }).not.toThrow()
      expect(occupancy.cells[0]).toBe(1)
    })
  })
})

/** A piece of owner 0 on columns 2..7 of a band 12 cells long. */
const space = (): ReturnType<typeof piecesOf> =>
  piecesOf(
    Int32Array.from({ length: 12 * 5 }, (_, at) => (at % 12 >= 2 && at % 12 <= 7 ? 0 : -1)),
    12,
    5
  )

describe('withOccupied', () => {
  describe('happy path', () => {
    it('blocks the cells of the crop another piece’s name covers', () => {
      const piece = space().get(0)?.[0]
      if (piece === undefined) throw new Error('no piece')
      const occupancy = createOccupancy(12, 5)
      occupancy.cells[2 * 12 + 8] = pieceTag(5, 0)
      const open = withOccupied(piece, occupancy, pieceTag(0, 0))
      // Grid column 8, the sea in the crop's ring, is crop column 8 - left; row 2 is crop row 2 - top.
      expect(open.blocked[(2 - piece.top) * piece.width + (8 - piece.left)]).toBe(COVERED)
      expect(piece.blocked[(2 - piece.top) * piece.width + (8 - piece.left)]).toBe(0)
    })
  })

  describe('variants', () => {
    it('leaves open the cells the piece’s own names cover, its other forms', () => {
      const piece = space().get(0)?.[0]
      if (piece === undefined) throw new Error('no piece')
      const occupancy = createOccupancy(12, 5)
      occupancy.cells[2 * 12 + 4] = pieceTag(0, 0)
      expect(withOccupied(piece, occupancy, pieceTag(0, 0))).toBe(piece)
    })
  })

  // L3, L4: N/A — a space from `piecesOf`, an occupancy of the same grid.

  describe('edge cases', () => {
    it('hands the space back as it is when no other name covers its crop', () => {
      const piece = space().get(0)?.[0]
      if (piece === undefined) throw new Error('no piece')
      expect(withOccupied(piece, createOccupancy(12, 5), pieceTag(0, 0))).toBe(piece)
    })
  })
})
