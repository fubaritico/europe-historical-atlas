import { describe, expect, it } from 'vitest'

import { piecesOf } from './testing/pieces'

/**
 * A grid of owners from a function of each cell.
 * @param width - columns
 * @param height - rows
 * @param ownerAt - the owner of a cell, negative for none
 * @returns the grid, row-major
 */
function gridOf(
  width: number,
  height: number,
  ownerAt: (x: number, y: number) => number
): Int32Array {
  const owners = new Int32Array(width * height)
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) owners[y * width + x] = ownerAt(x, y)
  return owners
}

describe('the pieces of an owner, cropped as spaces', () => {
  describe('happy path', () => {
    it('crops an owner with a ring of outside cells around it', () => {
      // Owner 7 holds columns 2..4 of rows 1..2 in a 6 × 4 grid.
      const owners = gridOf(6, 4, (x, y) => (x >= 2 && x <= 4 && y >= 1 && y <= 2 ? 7 : -1))
      const space = piecesOf(owners, 6, 4).get(7)?.[0]
      expect(space).toMatchObject({ left: 1, top: 0, width: 5, height: 4, cells: 6 })
      expect(Array.from(space?.mask ?? [])).toEqual([
        0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0,
      ])
    })
  })

  describe('variants', () => {
    it('keeps every piece of an owner, the largest first', () => {
      // A 1-cell island at column 0, a 3-cell mainland at columns 3..5.
      const owners = gridOf(7, 1, (x) => (x === 0 || (x >= 3 && x <= 5) ? 1 : -1))
      expect(piecesOf(owners, 7, 1).get(1)).toMatchObject([
        { left: 2, cells: 3 },
        { left: -1, cells: 1 },
      ])
    })

    it('widens the ring of outside cells when asked, for the distances past the piece', () => {
      const owners = gridOf(6, 4, (x, y) => (x >= 2 && x <= 4 && y >= 1 && y <= 2 ? 7 : -1))
      const space = piecesOf(owners, 6, 4, 3).get(7)?.[0]
      expect(space).toMatchObject({ left: -1, top: -2, width: 9, height: 8, cells: 6 })
      expect(space?.mask[3 * 9 + 3]).toBe(1)
    })

    it('blocks another owner’s cells in the crop, never the sea’s', () => {
      // Owner 0 on columns 1..2, owner 1 on column 3, the sea on column 0 and 4.
      const owners = gridOf(5, 1, (x) => (x === 1 || x === 2 ? 0 : x === 3 ? 1 : -1))
      const space = piecesOf(owners, 5, 1).get(0)?.[0]
      // The crop's middle row: the sea at column 0, the piece, the neighbour at column 3.
      expect(Array.from(space?.blocked.slice(4, 8) ?? [])).toEqual([0, 0, 0, 1])
    })

    it('gives each owner its own space', () => {
      const owners = gridOf(4, 2, (x) => (x < 2 ? 0 : 1))
      const spaces = piecesOf(owners, 4, 2)
      expect([...spaces.keys()].sort()).toEqual([0, 1])
      expect(spaces.get(1)).toMatchObject([{ left: 1, cells: 4 }])
    })

    it('splits two cells that touch by a corner only into two pieces', () => {
      // Cells (0,0) and (1,1) are owner 3; (1,0) and (0,1) are nobody's.
      const owners = Int32Array.from([3, -1, -1, 3])
      expect(
        piecesOf(owners, 2, 2)
          .get(3)
          ?.map(({ cells }) => cells)
      ).toEqual([1, 1])
    })
  })

  describe('managed errors', () => {
    it('refuses a grid whose size is not width × height', () => {
      expect(() => piecesOf(new Int32Array(5), 2, 3)).toThrow(/is not 2 × 3/)
    })

    it('refuses a ring under one cell, or not a whole number of cells', () => {
      const owners = gridOf(2, 2, () => 0)
      expect(() => piecesOf(owners, 2, 2, 0)).toThrow(/a ring of 0 cells/)
      expect(() => piecesOf(owners, 2, 2, 1.5)).toThrow(/a ring of 1.5 cells/)
    })
  })

  // L4: N/A — synchronous walk over a grid it checks; nothing else can fail.

  describe('edge cases', () => {
    it('gives a piece on the grid’s edge a ring outside the grid, so the frame counts as outside', () => {
      const space = piecesOf(
        gridOf(2, 2, () => 0),
        2,
        2
      ).get(0)?.[0]
      expect(space).toMatchObject({ left: -1, top: -1, width: 4, height: 4, cells: 4 })
      expect(space?.mask[0]).toBe(0)
      // Past the frame, a name may not spill either.
      expect(space?.blocked[0]).toBe(1)
      expect(space?.mask[5]).toBe(1)
    })

    it('has no space for a grid of nobody’s cells', () => {
      expect(
        piecesOf(
          gridOf(3, 3, () => -1),
          3,
          3
        ).size
      ).toBe(0)
    })

    it('keeps the order the pieces were found in when two are equal', () => {
      const owners = gridOf(5, 1, (x) => (x === 0 || x === 4 ? 2 : -1))
      expect(
        piecesOf(owners, 5, 1)
          .get(2)
          ?.map(({ left }) => left)
      ).toEqual([-1, 3])
    })
  })
})
