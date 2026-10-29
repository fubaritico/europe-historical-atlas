import { describe, expect, it } from 'vitest'

import { fittingOf, horizontalFit, lineLength, pointAlong, ridgeFit } from './nameFit'
import { COVERED } from './nameOccupancy'
import { ownerPieces } from './nameSpace'

import type { Fitting } from './nameFit'
import type { NameLine } from './nameLine'

/** A straight line from (0, 0) to (4, 0), sampled every unit. */
const STRAIGHT: NameLine = {
  points: [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ],
  lengths: [0, 1, 2, 3, 4],
}

/**
 * The fitting of a band of one owner, `width` by `height` cells.
 * @param width - columns
 * @param height - rows
 * @returns the band's fitting
 */
function band(width: number, height: number, ring = 1): Fitting {
  const space = ownerPieces(new Int32Array(width * height), width, height, ring).get(0)?.[0]
  if (space === undefined) throw new Error('no band')
  return fittingOf(space)
}

/**
 * The fitting of a shape drawn on a grid.
 * @param width - columns
 * @param height - rows
 * @param inside - whether a cell's centre is in the shape
 * @param ring - the ring of outside cells around it
 * @param neighbour - whether a cell outside the shape is another owner's — the sea, otherwise
 * @returns the shape's largest piece, fitted
 */
function shape(
  width: number,
  height: number,
  inside: (x: number, y: number) => boolean,
  ring = 1,
  neighbour: (x: number, y: number) => boolean = () => false
): Fitting {
  const owners = new Int32Array(width * height)
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      owners[y * width + x] = inside(x, y) ? 0 : neighbour(x, y) ? 1 : -1
  const space = ownerPieces(owners, width, height, ring).get(0)?.[0]
  if (space === undefined) throw new Error('no shape')
  return fittingOf(space)
}

/**
 * The least room past the margin anywhere in the box a name fills, read at the cell under each point of a fine
 * sampling of the box — its signed distance to the edge, as the fit reads it.
 * @param fitting - the space and its distances
 * @param line - the line the name is set on
 * @param extent - the name's length and height at a size of one
 * @param size - the size fitted
 * @param margin - the margin asked for
 * @returns the least room past the margin, in cells
 */
function leastSlack(
  fitting: Fitting,
  line: NameLine,
  extent: { length: number; height: number },
  size: number,
  margin: number
): number {
  const { edge, space } = fitting
  const total = lineLength(line)
  const start = (total - extent.length * size) / 2
  const half = (extent.height * size) / 2
  let least = Infinity
  for (let walked = start; walked <= total - start; walked += 0.1) {
    const { x, y, angle } = pointAlong(line, walked)
    for (let t = -half; t <= half; t += 0.1) {
      const col = Math.round(x + t * Math.sin(angle))
      const row = Math.round(y - t * Math.cos(angle))
      least = Math.min(least, (edge[row * space.width + col] ?? Number.NaN) - margin)
    }
  }
  return least
}

/**
 * A band pinched at its middle, its axis at `slant` radians: wherever a name crosses the pinch, the room there,
 * not at the name's ends, bounds its size — the room the fit measures once per line.
 * @param slant - the axis's angle from `+x`
 * @returns the band's fitting
 */
function pinched(slant: number): Fitting {
  return shape(90, 70, (x, y) => {
    const along = (x - 45) * Math.cos(slant) + (y - 35) * Math.sin(slant)
    const across = (y - 35) * Math.cos(slant) - (x - 45) * Math.sin(slant)
    return Math.abs(along) < 38 && Math.abs(across) < (Math.abs(along) < 3 ? 5 : 12)
  })
}

/** A band 8 rows high in a sea, 4 cells of ring around it: room to spill. */
const ISLAND = shape(70, 20, (x, y) => x >= 5 && x < 65 && y >= 6 && y < 14, 4)

/** The same band with a neighbour all along its north side and the sea to its south. */
const COASTAL = shape(
  70,
  20,
  (x, y) => x >= 5 && x < 65 && y >= 6 && y < 14,
  4,
  (_, y) => y < 6
)

const STRAIGHT_PINCH = pinched(0)
const SLANTED_PINCH = pinched(0.52)

/** Reading at the cell under a point rather than between the centres errs by up to a half diagonal. */
const CELL_READING = Math.SQRT1_2

describe('fittingOf', () => {
  describe('happy path', () => {
    it('reads each cell’s distance to the edge, half a cell either side of it, inside and out', () => {
      // A band 4 rows high in a ring of 3: the crop's rows 3..6 are the band.
      const { edge, space } = band(10, 4, 3)
      const column = (row: number): number => edge[row * space.width + 6] ?? Number.NaN
      expect([column(0), column(2), column(3), column(4)]).toEqual([-2.5, -0.5, 0.5, 1.5])
    })
  })

  // L2: N/A — one way to read a space.
  // L3, L4: N/A — a mask from `ownerPieces`, which checks its grid.

  describe('edge cases', () => {
    it('keeps the inside distances the lines are drawn from beside the signed ones', () => {
      const { distances, edge } = band(10, 4, 3)
      expect(distances.every((d, at) => d === 0 || d - 0.5 === edge[at])).toBe(true)
    })
  })
})

describe('pointAlong', () => {
  describe('happy path', () => {
    it('reaches the point a length along the line, with its direction', () => {
      expect(pointAlong(STRAIGHT, 2.5)).toEqual({ x: 2.5, y: 0, angle: 0 })
    })
  })

  describe('variants', () => {
    it('reads a falling segment’s direction downward', () => {
      const falling: NameLine = {
        points: [
          [0, 0],
          [0, 1],
        ],
        lengths: [0, 1],
      }
      expect(pointAlong(falling, 0.5).angle).toBeCloseTo(Math.PI / 2, 9)
    })
  })

  describe('managed errors', () => {
    it('refuses a line with fewer points than lengths, a line built wrong', () => {
      const broken: NameLine = { points: [[0, 0]], lengths: [0, 1] }
      expect(() => pointAlong(broken, 0.5)).toThrow(/has none at 0/)
    })
  })

  // L4: N/A — pure arithmetic over a line it checks.

  describe('edge cases', () => {
    it('holds a length past either end at that end', () => {
      expect([pointAlong(STRAIGHT, -1).x, pointAlong(STRAIGHT, 9).x]).toEqual([0, 4])
    })
  })
})

describe('horizontalFit', () => {
  describe('happy path', () => {
    it('lays a short name straight across a band, its size bounded by the band’s height', () => {
      const { line, size } = horizontalFit(band(60, 12), { length: 6, height: 1 }, 1)
      expect(line.points.every(([, y]) => y === line.points[0]?.[1])).toBe(true)
      // 12 rows less a margin each side, less what reading at the cells' centres costs.
      expect(size).toBeGreaterThan(8.5)
      expect(size).toBeLessThanOrEqual(10)
    })
  })

  describe('variants', () => {
    it('bounds a long name’s size by the line’s length', () => {
      const { line, size } = horizontalFit(band(60, 12), { length: 30, height: 1 }, 1)
      expect(size * 30).toBeLessThanOrEqual(lineLength(line))
    })

    // The guard of the room measured once per line: a walk across it that leaps too far would let the letters
    // into the margin, where a size tried on the distances themselves never goes.
    it.each([
      ['a band pinched at its middle', STRAIGHT_PINCH],
      ['a slanted band pinched at its middle', SLANTED_PINCH],
    ])('keeps every point of the letters the margin from the edge, in %s', (_, fitting) => {
      const extent = { length: 8, height: 1 }
      const { line, size } = horizontalFit(fitting, extent, 3)
      expect(size).toBeGreaterThan(0)
      expect(leastSlack(fitting, line, extent, size, 3)).toBeGreaterThanOrEqual(-CELL_READING)
    })

    // The overflow (the dev, 2026-10-28: « un texte peut dépasser un peu de sa zone »): a margin below zero.
    it('lets a margin below zero spill the letters over the edge, the name larger than at none', () => {
      const extent = { length: 4, height: 1 }
      const inside = horizontalFit(ISLAND, extent, 0).size
      const spilling = horizontalFit(ISLAND, extent, -2).size
      expect(spilling).toBeGreaterThan(inside + 3)
    })

    it('keeps a spilling name within the overflow, past the edge by no more', () => {
      const extent = { length: 4, height: 1 }
      const { line, size } = horizontalFit(ISLAND, extent, -2)
      expect(leastSlack(ISLAND, line, extent, size, -2)).toBeGreaterThanOrEqual(-CELL_READING)
    })

    // The dev, 2026-10-29: a name spilling into the next country is what made the names overlap.
    it('spills over the sea only, never over a neighbour', () => {
      const extent = { length: 4, height: 1 }
      const { line, size } = horizontalFit(COASTAL, extent, -2)
      const { bound, space } = COASTAL
      // Every point of the letters stays off the neighbour's cells, the whole north side.
      const half = size / 2
      const middle = pointAlong(line, lineLength(line) / 2)
      const top = Math.round(middle.y - half)
      expect(bound[top * space.width + Math.round(middle.x)]).toBeGreaterThanOrEqual(-CELL_READING)
      expect(size).toBeLessThan(horizontalFit(ISLAND, extent, -2).size)
    })

    // The dev, 2026-10-29: « faudrait quand même que ça puisse chevaucher un petit peu entre voisins ».
    it('bites into a neighbour by as much as it is allowed, a larger name for it, no further', () => {
      const extent = { length: 4, height: 1 }
      const biting = fittingOf(COASTAL.space, 1)
      const { line, size } = horizontalFit(biting, extent, -2)
      expect(size).toBeGreaterThan(horizontalFit(COASTAL, extent, -2).size)
      // No point of the letters further into the neighbour than the bite, at the cell under it.
      const half = size / 2
      const middle = pointAlong(line, lineLength(line) / 2)
      const top = Math.round(middle.y - half)
      expect(
        COASTAL.bound[top * COASTAL.space.width + Math.round(middle.x)]
      ).toBeGreaterThanOrEqual(-1 - CELL_READING)
    })

    it('never bites into another name, however far it may bite into a neighbour', () => {
      // The coastal band's neighbour read as another piece's name instead.
      const covered = {
        ...COASTAL.space,
        blocked: COASTAL.space.blocked.map((cell) => cell * COVERED),
      }
      const extent = { length: 4, height: 1 }
      expect(horizontalFit(fittingOf(covered, 3), extent, -2).size).toBe(
        horizontalFit(fittingOf(covered, 0), extent, -2).size
      )
    })

    it('never spills past the map’s frame', () => {
      // The band fills the grid: whatever lies past it is past the frame.
      const extent = { length: 4, height: 1 }
      expect(horizontalFit(band(60, 8, 4), extent, -2).size).toBeCloseTo(
        horizontalFit(band(60, 8, 4), extent, 0).size,
        1
      )
    })

    it('fits a block twice as tall at about half the size', () => {
      const one = horizontalFit(band(60, 12), { length: 4, height: 1 }, 1).size
      const two = horizontalFit(band(60, 12), { length: 4, height: 2 }, 1).size
      expect(two).toBeCloseTo(one / 2, 0)
    })
  })

  describe('managed errors', () => {
    it('gives no size where the margin leaves no room', () => {
      expect(horizontalFit(band(30, 2), { length: 2, height: 1 }, 1).size).toBe(0)
    })
  })

  // L4: N/A — `namePlacement` checks the measure before asking.

  describe('edge cases', () => {
    it('fits a name in a space of one cell at no margin, smaller than the cell', () => {
      const { size } = horizontalFit(band(1, 1), { length: 1, height: 1 }, 0)
      expect(size).toBeGreaterThan(0)
      expect(size).toBeLessThan(1)
    })
  })
})

describe('ridgeFit', () => {
  describe('happy path', () => {
    it('writes a long name along a standing band, reading upward, larger than straight across', () => {
      const column = band(12, 80)
      const extent = { length: 12, height: 1 }
      const along = ridgeFit(column, extent, 1)
      if (along === null) throw new Error('no ridge')
      const first = along.line.points[0]
      const last = along.line.points[along.line.points.length - 1]
      expect(first?.[1] ?? Number.NaN).toBeGreaterThan(last?.[1] ?? Number.NaN)
      expect(along.size).toBeGreaterThan(horizontalFit(column, extent, 1).size * 3)
    })
  })

  describe('variants', () => {
    it('keeps every point of the letters the margin from the edge, along a slanted band pinched at its middle', () => {
      const extent = { length: 8, height: 1 }
      const along = ridgeFit(SLANTED_PINCH, extent, 3)
      if (along === null) throw new Error('no ridge')
      expect(along.size).toBeGreaterThan(0)
      expect(leastSlack(SLANTED_PINCH, along.line, extent, along.size, 3)).toBeGreaterThanOrEqual(
        -CELL_READING
      )
    })
  })

  // L2: the thicknesses tried are `nameLine`'s, asserted there.

  describe('managed errors', () => {
    it('gives no ridge in a space of one cell, which gives no direction', () => {
      expect(ridgeFit(band(1, 1), { length: 1, height: 1 }, 0)).toBeNull()
    })
  })

  // L4: N/A — `namePlacement` checks the measure before asking.
  // L5: a ridge with no room for the margin is `horizontalFit`'s case, sized `0` by the same search.
})
