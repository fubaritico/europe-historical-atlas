import { describe, expect, it } from 'vitest'

import {
  bucketEdgesByRow,
  buildAdjacency,
  chooseColorSlots,
  claimNeighbours,
  claimedCells,
  createRegionRaster,
  fillRowSpans,
  rowCrossings,
} from './regionRaster'

import type { Region } from './regionSource'

/** A unit square, wound clockwise. */
const SQUARE: Region = {
  name: 'Square',
  subjectTo: null,
  rings: [
    [
      { u: 0, v: 0 },
      { u: 1, v: 0 },
      { u: 1, v: 1 },
      { u: 0, v: 1 },
    ],
  ],
} as unknown as Region

describe('bucketEdgesByRow', () => {
  describe('happy path', () => {
    it('files an edge under every row it spans', () => {
      expect(bucketEdgesByRow(SQUARE, 5).size).toBe(5)
    })
  })

  describe('variants', () => {
    it('stores four numbers per edge, flat', () => {
      for (const bucket of bucketEdgesByRow(SQUARE, 5).values()) {
        expect(bucket.length % 4).toBe(0)
      }
    })

    it('files both vertical sides of a square under the same rows', () => {
      expect(bucketEdgesByRow(SQUARE, 3).get(1)).toHaveLength(8)
    })
  })

  describe('managed errors', () => {
    it('drops horizontal edges, which no scanline crosses', () => {
      const flat = {
        rings: [
          [
            { u: 0, v: 0.5 },
            { u: 1, v: 0.5 },
          ],
        ],
      } as unknown as Region
      expect(bucketEdgesByRow(flat, 5).size).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    it('files nothing for a polity with no rings', () => {
      expect(bucketEdgesByRow({ rings: [] } as unknown as Region, 5).size).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('clamps a ring reaching past the grid instead of indexing off it', () => {
      const over = {
        rings: [
          [
            { u: 0, v: -5 },
            { u: 1, v: 5 },
            { u: 0.5, v: -5 },
          ],
        ],
      } as unknown as Region
      for (const row of bucketEdgesByRow(over, 4).keys()) {
        expect(row).toBeGreaterThanOrEqual(0)
        expect(row).toBeLessThan(4)
      }
    })
  })
})

describe('rowCrossings', () => {
  // One edge from (0, 0) to (1, 1), as a flat quadruple.
  const diagonal = [0, 0, 1, 1]

  describe('happy path', () => {
    it('finds the crossing halfway down a diagonal', () => {
      const out: number[] = []
      rowCrossings(diagonal, 0.5, out)
      expect(out).toEqual([0.5])
    })
  })

  describe('variants', () => {
    it('sorts crossings left to right, whatever order the edges came in', () => {
      const out: number[] = []
      rowCrossings([1, 0, 1, 1, 0, 0, 0, 1], 0.5, out)
      expect(out).toEqual([0, 1])
    })

    it('clears the array first, so one buffer serves the whole raster', () => {
      const out = [9, 9, 9]
      rowCrossings(diagonal, 0.5, out)
      expect(out).toEqual([0.5])
    })
  })

  describe('managed errors', () => {
    it('counts a shared vertex once, the span being half-open', () => {
      // Two edges meeting exactly at v = 0.5: counting both would flip the fill inside out.
      const out: number[] = []
      rowCrossings([0, 0, 0.5, 0.5, 0.5, 0.5, 1, 1], 0.5, out)
      expect(out).toHaveLength(1)
    })
  })

  describe('unmanaged errors', () => {
    it('finds nothing above every edge', () => {
      const out: number[] = []
      rowCrossings(diagonal, 2, out)
      expect(out).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('finds nothing in an empty bucket', () => {
      const out: number[] = []
      rowCrossings([], 0.5, out)
      expect(out).toHaveLength(0)
    })
  })
})

describe('fillRowSpans', () => {
  describe('happy path', () => {
    it('claims the cells between a pair of crossings', () => {
      const cells = new Int16Array(16).fill(-1)
      fillRowSpans(cells, 4, 1, [0, 1], 7)
      expect([...cells.slice(4, 8)]).toEqual([7, 7, 7, 7])
    })
  })

  describe('variants', () => {
    it('fills each pair independently, leaving the gap between them alone', () => {
      const cells = new Int16Array(10).fill(-1)
      fillRowSpans(cells, 10, 0, [0, 0.2, 0.8, 1], 3)
      expect(cells[5]).toBe(-1)
      expect(cells[0]).toBe(3)
      expect(cells[9]).toBe(3)
    })
  })

  describe('managed errors', () => {
    it('ignores a lone crossing, which encloses nothing', () => {
      const cells = new Int16Array(4).fill(-1)
      fillRowSpans(cells, 4, 0, [0.5], 1)
      expect([...cells]).toEqual([-1, -1, -1, -1])
    })
  })

  describe('unmanaged errors', () => {
    it('clamps a span reaching past the grid rather than writing outside the row', () => {
      const cells = new Int16Array(8).fill(-1)
      fillRowSpans(cells, 4, 0, [-9, 9], 2)
      expect([...cells.slice(4)]).toEqual([-1, -1, -1, -1])
    })
  })

  describe('edge cases', () => {
    it('writes nothing for no crossings', () => {
      const cells = new Int16Array(4).fill(-1)
      fillRowSpans(cells, 4, 0, [], 1)
      expect([...cells]).toEqual([-1, -1, -1, -1])
    })
  })
})

const allLand = (): boolean => true

describe('claimedCells and claimNeighbours', () => {
  describe('happy path', () => {
    it('reports only the cells a polity already holds', () => {
      const cells = Int16Array.from([-1, 4, -1, -1])
      expect(claimedCells(cells)).toEqual([1])
    })

    it('hands a claim to the unclaimed land beside it', () => {
      const cells = Int16Array.from([-1, -1, -1, -1, 5, -1, -1, -1, -1])
      const next: number[] = []
      claimNeighbours(cells, 3, 3, 4, allLand, next)
      expect([...cells]).toEqual([-1, 5, -1, 5, 5, 5, -1, 5, -1])
      expect(next).toHaveLength(4)
    })
  })

  describe('variants', () => {
    it('grows orthogonally only, so a claim cannot leak across a strait diagonally', () => {
      const cells = Int16Array.from([-1, -1, -1, -1, 5, -1, -1, -1, -1])
      claimNeighbours(cells, 3, 3, 4, allLand, [])
      expect(cells[0]).toBe(-1)
      expect(cells[8]).toBe(-1)
    })
  })

  describe('managed errors', () => {
    it('never crosses water', () => {
      const cells = Int16Array.from([-1, -1, -1, -1, 5, -1, -1, -1, -1])
      claimNeighbours(cells, 3, 3, 4, () => false, [])
      expect([...cells].filter((c) => c === 5)).toHaveLength(1)
    })

    it('leaves a cell another polity already holds', () => {
      const cells = Int16Array.from([-1, 2, -1, -1, 5, -1, -1, -1, -1])
      claimNeighbours(cells, 3, 3, 4, allLand, [])
      expect(cells[1]).toBe(2)
    })
  })

  describe('unmanaged errors', () => {
    it('does not walk off the edge of the grid', () => {
      const cells = Int16Array.from([5, -1, -1, -1])
      const next: number[] = []
      claimNeighbours(cells, 2, 2, 0, allLand, next)
      expect(next.every((i) => i >= 0 && i < 4)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('reports no frontier for an entirely unclaimed grid', () => {
      expect(claimedCells(new Int16Array(9).fill(-1))).toHaveLength(0)
    })
  })
})

describe('buildAdjacency', () => {
  /** Two polities side by side, plus unclaimed sea on the right. */
  const raster = createRegionRaster(3, 1, Int16Array.from([0, 1, -1]))

  describe('happy path', () => {
    it('records both directions of a shared border', () => {
      const neighbours = buildAdjacency(raster, 2)
      expect(neighbours[0]?.has(1)).toBe(true)
      expect(neighbours[1]?.has(0)).toBe(true)
    })
  })

  describe('variants', () => {
    it('does not make a polity its own neighbour', () => {
      const wide = createRegionRaster(3, 1, Int16Array.from([0, 0, 0]))
      expect(buildAdjacency(wide, 1)[0]?.size).toBe(0)
    })

    it('reads adjacency down the grid as well as across it', () => {
      const stacked = createRegionRaster(1, 2, Int16Array.from([0, 1]))
      expect(buildAdjacency(stacked, 2)[0]?.has(1)).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('does not treat unclaimed sea as a neighbour', () => {
      expect(buildAdjacency(raster, 2)[1]?.size).toBe(1)
    })
  })

  describe('unmanaged errors', () => {
    it('returns one empty set per polity for an unclaimed grid', () => {
      const empty = createRegionRaster(2, 2, new Int16Array(4).fill(-1))
      expect(buildAdjacency(empty, 3).map((s) => s.size)).toEqual([0, 0, 0])
    })
  })

  describe('edge cases', () => {
    it('holds up on a single cell', () => {
      expect(buildAdjacency(createRegionRaster(1, 1, Int16Array.from([0])), 1)[0]?.size).toBe(0)
    })
  })
})

describe('chooseColorSlots', () => {
  describe('happy path', () => {
    it('gives two neighbours different slots', () => {
      const slots = chooseColorSlots([new Set([1]), new Set([0])], [false, false], 4)
      expect(slots[0]).not.toBe(slots[1])
    })
  })

  describe('variants', () => {
    it('lets two polities that do not touch share a slot', () => {
      const slots = chooseColorSlots([new Set(), new Set()], [false, false], 4)
      expect(slots[0]).toBe(slots[1])
    })

    it('colours the most connected first, so it picks while the palette is open', () => {
      // Region 1 touches both others; taking slot 0 first is what leaves the others free to share it.
      const slots = chooseColorSlots(
        [new Set([1]), new Set([0, 2]), new Set([1])],
        [false, false, false],
        4
      )
      expect(slots[1]).toBe(0)
      expect(slots[0]).not.toBe(0)
    })

    it('takes no slot for a polity that already has an editorial colour', () => {
      expect(chooseColorSlots([new Set([1]), new Set([0])], [true, false], 4)[0]).toBe(-1)
    })
  })

  describe('managed errors', () => {
    it('falls back rather than leaving a hole when neighbours outnumber colours', () => {
      const slots = chooseColorSlots(
        [new Set([1, 2]), new Set([0, 2]), new Set([0, 1])],
        [false, false, false],
        2
      )
      for (const slot of slots) expect(slot).toBeGreaterThanOrEqual(0)
    })
  })

  describe('unmanaged errors', () => {
    it('returns nothing for no polities', () => {
      expect(chooseColorSlots([], [], 4)).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('gives every polity the one slot there is', () => {
      const slots = chooseColorSlots([new Set([1]), new Set([0])], [false, false], 1)
      expect([...slots]).toEqual([0, 0])
    })
  })
})
