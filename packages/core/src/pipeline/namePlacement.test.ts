import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_NAME_WEIGHTS } from './nameChoice'
import { createOccupancy, occupy, pieceTag } from './nameOccupancy'
import { placeNames } from './namePlacement'

import type { MeasureName, NamePlacementOptions, PlacedName } from './namePlacement'

/** Every letter one unit wide, reaching one unit above its baseline and none below — a monospace stand-in for the canvas. */
const monospace: MeasureName = (text) => ({
  advances: Array.from(text, () => 1),
  ascent: 1,
  descent: 0,
})

/**
 * A margin of one cell, no overflow, any size worth writing, and the default weights — but a border touched and two lines made
 * too costly to be chosen, unless a test says otherwise.
 */
const OPTIONS: NamePlacementOptions = {
  margin: 1,
  overflow: 0,
  neighbourBite: 0,
  minSize: 0.5,
  longMinSize: 0.5,
  maxSize: 1000,
  weights: { ...DEFAULT_NAME_WEIGHTS, border: 10, twoLines: 10 },
}

/** A grid of owners, with its size. */
interface Grid {
  readonly owners: Int32Array
  readonly width: number
  readonly height: number
}

/**
 * A grid of owners from a function of each cell.
 * @param width - columns
 * @param height - rows
 * @param ownerAt - the owner of a cell, negative for none
 * @returns the grid
 */
function gridOf(width: number, height: number, ownerAt: (x: number, y: number) => number): Grid {
  const owners = new Int32Array(width * height)
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) owners[y * width + x] = ownerAt(x, y)
  return { owners, width, height }
}

/**
 * How far a point lies from the edge of its owner's cells, by brute force: the nearest centre of a cell
 * that is not the owner's — the grid's frame counted as such — less half a cell.
 * @param grid - the grid
 * @param owner - the owner
 * @param x - the point's column
 * @param y - its row
 * @returns the distance to the edge, in cells
 */
function clearance(grid: Grid, owner: number, x: number, y: number): number {
  let nearest = Infinity
  for (let row = -1; row <= grid.height; row += 1)
    for (let col = -1; col <= grid.width; col += 1) {
      const inGrid = row >= 0 && col >= 0 && row < grid.height && col < grid.width
      if (inGrid && grid.owners[row * grid.width + col] === owner) continue
      nearest = Math.min(nearest, Math.hypot(x - col, y - row))
    }
  return nearest - 0.5
}

/**
 * Whether every letter of a name keeps the margin plus half its height from its space's edge — what the
 * placement promises, checked without any of its own arithmetic. The letters are {@link monospace}'s, all
 * above their baseline, so a letter's middle is half its size above its place. It may sit between the samples
 * the placement read, so a quarter of a cell is allowed.
 * @param grid - the grid
 * @param name - the name placed
 * @param margin - the margin promised
 * @returns whether every letter keeps it
 */
function keepsClear(grid: Grid, name: PlacedName, margin: number): boolean {
  const letters = Array.from(name.text)
  // A space draws nothing — the one broken at sits past the end of the first line.
  const half = name.size / 2
  return name.glyphs.every(
    ({ x, y, angle }, at) =>
      letters[at] === ' ' ||
      clearance(grid, name.owner, x + half * Math.sin(angle), y - half * Math.cos(angle)) >=
        margin + half - 0.25
  )
}

/** A band 60 cells long and 12 high, all of owner 0. */
const BAND = gridOf(60, 12, () => 0)

const short: MeasureName = () => ({ advances: [1, 1], ascent: 1, descent: 0 })

const flat: MeasureName = (text) => ({
  advances: Array.from(text, () => 1),
  ascent: 0,
  descent: 0,
})

const broken: MeasureName = (text) => ({
  advances: Array.from(text, () => Number.NaN),
  ascent: 1,
  descent: 0,
})

/**
 * How far a name's letters stray from the line through its first and last letter — near zero on one
 * line, about the gap between the lines on two. Spaces draw nothing and are left out.
 * @param name - the name placed
 * @returns the largest distance, in cells
 */
const spread = (name: PlacedName | undefined): number => {
  const letters = Array.from(name?.text ?? '')
  const glyphs = (name?.glyphs ?? []).filter((_, at) => letters[at] !== ' ')
  const first = glyphs[0]
  const last = glyphs[glyphs.length - 1]
  if (first === undefined || last === undefined) return Number.NaN
  const length = Math.hypot(last.x - first.x, last.y - first.y)
  return Math.max(
    ...glyphs.map(
      ({ x, y }) =>
        Math.abs((last.x - first.x) * (first.y - y) - (first.x - x) * (last.y - first.y)) / length
    )
  )
}

// "p" reaches 0.3 below its baseline; the first line has none, so nothing of it sits under "AAAA".
const descending: MeasureName = (text) => ({
  advances: Array.from(text, () => 1),
  ascent: 1,
  descent: text.includes('p') ? 0.3 : 0,
})

/**
 * Weights from the tests' own, a few changed.
 * @param changed - the weights changed
 * @returns the options
 */
const weighing = (changed: Partial<NamePlacementOptions['weights']>): NamePlacementOptions => ({
  ...OPTIONS,
  weights: { ...OPTIONS.weights, ...changed },
})

/**
 * How many points of the later of two names' letters fall in the cells the first one marks — its letters and their
 * edge. The letters are {@link monospace}'s, all above their baseline, read half a cell in from their box's sides.
 * @param placed - the two names, on a grid 44 cells across
 * @returns the points inside
 */
const overlaps = (placed: readonly PlacedName[]): number => {
  const [first, later] = [...placed].sort((p, q) => q.size - p.size)
  if (first === undefined || later === undefined) return Number.NaN
  const occupancy = createOccupancy(44, 12)
  occupy(occupancy, 1, {
    ...monospace(first.text),
    text: first.text,
    size: first.size,
    glyphs: first.glyphs,
  })
  let inside = 0
  const half = later.size / 2 - 0.5
  for (const { x, y } of later.glyphs)
    for (let along = -half; along <= half; along += 0.25)
      for (let up = 0.5; up <= later.size - 0.5; up += 0.25)
        if (occupancy.cells[Math.round(y - up) * 44 + Math.round(x + along)] === 1) inside += 1
  return inside
}

describe('placeNames', () => {
  describe('happy path', () => {
    it('writes a short name straight across a band, as tall as the band allows with its margin', () => {
      const { placed } = placeNames(
        BAND.owners,
        60,
        12,
        [{ owner: 0, text: 'ABCDEF' }],
        monospace,
        OPTIONS
      )
      const [name] = placed
      if (name === undefined) throw new Error('not placed')
      // The band is 12 high: 12 = 2 × margin + size, less what the frame's ring costs at the cells' centres.
      expect(name.size).toBeGreaterThan(8.5)
      expect(name.size).toBeLessThanOrEqual(10)
      expect(name.glyphs.every(({ angle }) => angle === 0)).toBe(true)
      expect(keepsClear(BAND, name, OPTIONS.margin)).toBe(true)
    })

    it('places one letter per code point, in reading order', () => {
      const { placed } = placeNames(
        BAND.owners,
        60,
        12,
        [{ owner: 0, text: 'Œsel' }],
        monospace,
        OPTIONS
      )
      const glyphs = placed[0]?.glyphs ?? []
      expect(glyphs).toHaveLength(4)
      expect(glyphs.map(({ x }) => x)).toEqual([...glyphs.map(({ x }) => x)].sort((a, b) => a - b))
    })

    it('centres the name in its space', () => {
      const { placed } = placeNames(
        BAND.owners,
        60,
        12,
        [{ owner: 0, text: 'ABCD' }],
        monospace,
        OPTIONS
      )
      const xs = (placed[0]?.glyphs ?? []).map(({ x }) => x)
      expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(29.5, 1)
    })
  })

  describe('variants', () => {
    it('numbers each piece a name is written in, the largest first', () => {
      // An island of 8 columns, then a mainland of 24, both owner 0.
      const islands = gridOf(40, 12, (x) => (x < 8 || x >= 16 ? 0 : -1))
      const { placed } = placeNames(
        islands.owners,
        40,
        12,
        [{ owner: 0, text: 'AB' }],
        monospace,
        OPTIONS
      )
      const xs = (piece: number): number[] =>
        (placed.find((name) => name.piece === piece)?.glyphs ?? []).map(({ x }) => x)
      expect(placed.map(({ piece }) => piece).sort()).toEqual([0, 1])
      expect(Math.min(...xs(0))).toBeGreaterThanOrEqual(16)
      expect(Math.max(...xs(1))).toBeLessThan(8)
    })

    it('spills a name over its border by the overflow, larger, when its border weight lets it', () => {
      // A band 8 rows high in a sea: the name is held by the band's height.
      const island = gridOf(80, 30, (_, y) => (y >= 11 && y < 19 ? 0 : -1))
      const free = { ...OPTIONS, weights: { ...OPTIONS.weights, border: 0 } }
      const size = (overflow: number): number =>
        placeNames(island.owners, 80, 30, [{ owner: 0, text: 'ABCDEF' }], monospace, {
          ...free,
          overflow,
        }).placed[0]?.size ?? Number.NaN
      expect(size(3)).toBeGreaterThan(size(0) + 4)
      // No taller than the band and the overflow either side.
      expect(size(3)).toBeLessThanOrEqual(8 + 2 * 3)
    })

    // The dev, 2026-10-29: « il faudrait que ça ne se chevauche pas ».
    it('keeps a name off the cells another piece’s name covers, when the level shares its cells', () => {
      // Two islands a sea of three cells apart, each name spilling toward the other.
      const islands = gridOf(44, 12, (x, y) =>
        y >= 4 && y < 8 ? (x >= 2 && x < 20 ? 0 : x >= 23 && x < 41 ? 1 : -1) : -1
      )
      const free = { ...OPTIONS, overflow: 3, weights: { ...OPTIONS.weights, border: 0 } }
      const asked = [
        { owner: 0, text: 'ABCDEF' },
        { owner: 1, text: 'ABCDEF' },
      ]
      const alone = placeNames(islands.owners, 44, 12, asked, monospace, free).placed
      const shared = placeNames(
        islands.owners,
        44,
        12,
        asked,
        monospace,
        free,
        createOccupancy(44, 12)
      ).placed
      expect(overlaps(alone)).toBeGreaterThan(0)
      expect(shared).toHaveLength(2)
      expect(overlaps(shared)).toBe(0)
    })

    it('marks the names it places in the shared cells, each with its piece’s tag', () => {
      const occupancy = createOccupancy(60, 12)
      placeNames(BAND.owners, 60, 12, [{ owner: 0, text: 'AB' }], monospace, OPTIONS, occupancy)
      expect(occupancy.cells.some((cell) => cell === pieceTag(0, 0))).toBe(true)
    })

    it('sizes a long name by the band’s length rather than its height', () => {
      const text = 'A'.repeat(30)
      const { placed } = placeNames(BAND.owners, 60, 12, [{ owner: 0, text }], monospace, OPTIONS)
      const size = placed[0]?.size ?? Number.NaN
      expect(size * 30).toBeLessThanOrEqual(60)
      expect(size).toBeLessThan(2)
    })

    it('reads a name up a standing band, from the bottom', () => {
      const column = gridOf(12, 80, () => 0)
      const { placed } = placeNames(
        column.owners,
        12,
        80,
        [{ owner: 0, text: 'ABCDEFGHIJKL' }],
        monospace,
        OPTIONS
      )
      const name = placed[0]
      if (name === undefined) throw new Error('not placed')
      expect(name.glyphs.every(({ angle }) => Math.abs(angle + Math.PI / 2) < 0.1)).toBe(true)
      expect(keepsClear(column, name, OPTIONS.margin)).toBe(true)
    })

    it('bends a name along a gentle arc, where a straight line would be shorter, inside it', () => {
      // A slice of a ring 10 cells thick and 75 in radius, about 70° of it across the grid.
      const arch = gridOf(90, 48, (x, y) => {
        const r = Math.hypot(x - 45, y - 100)
        return r >= 70 && r <= 80 ? 0 : -1
      })
      const { placed } = placeNames(
        arch.owners,
        90,
        48,
        [{ owner: 0, text: 'ABCDEFGHIJ' }],
        monospace,
        OPTIONS
      )
      const name = placed[0]
      if (name === undefined) throw new Error('not placed')
      const angles = name.glyphs.map(({ angle }) => angle)
      expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(0.3)
      expect(keepsClear(arch, name, OPTIONS.margin)).toBe(true)
    })

    it('keeps a name inside an L, clear of its inner corner', () => {
      const ell = gridOf(50, 50, (x, y) => (x < 14 || y >= 36 ? 0 : -1))
      const { placed } = placeNames(
        ell.owners,
        50,
        50,
        [{ owner: 0, text: 'ABCDEFGH' }],
        monospace,
        OPTIONS
      )
      const name = placed[0]
      if (name === undefined) throw new Error('not placed')
      expect(keepsClear(ell, name, OPTIONS.margin)).toBe(true)
    })

    it('writes a name straight across a round space', () => {
      const disc = gridOf(41, 41, (x, y) => (Math.hypot(x - 20, y - 20) <= 19 ? 0 : -1))
      const { placed } = placeNames(
        disc.owners,
        41,
        41,
        [{ owner: 0, text: 'ABCDE' }],
        monospace,
        OPTIONS
      )
      expect(placed[0]?.glyphs.every(({ angle }) => angle === 0)).toBe(true)
    })

    it('names two neighbours each in its own space', () => {
      const pair = gridOf(80, 20, (x) => (x < 40 ? 0 : 1))
      const { placed } = placeNames(
        pair.owners,
        80,
        20,
        [
          { owner: 0, text: 'WEST' },
          { owner: 1, text: 'EAST' },
        ],
        monospace,
        OPTIONS
      )
      expect(placed).toHaveLength(2)
      for (const name of placed) expect(keepsClear(pair, name, OPTIONS.margin)).toBe(true)
    })

    it('moves a suzerain’s name into what its shown vassal leaves it, smaller', () => {
      // From afar the vassal wears its suzerain's colour: one owner. Closer, it is its own.
      const afar = gridOf(80, 20, () => 0)
      const closer = gridOf(80, 20, (x) => (x < 40 ? 0 : 1))
      const names = [
        { owner: 0, text: 'SUZERAIN' },
        { owner: 1, text: 'VASSAL' },
      ]
      const before = placeNames(afar.owners, 80, 20, names, monospace, OPTIONS).placed
      const after = placeNames(closer.owners, 80, 20, names, monospace, OPTIONS).placed
      const suzerain = after.find(({ owner }) => owner === 0)
      if (suzerain === undefined) throw new Error('not placed')
      expect(before.map(({ owner }) => owner)).toEqual([0])
      expect(suzerain.glyphs.every(({ x }) => x < 40)).toBe(true)
      expect(suzerain.size).toBeLessThan(before[0]?.size ?? Number.NaN)
      expect(after.some(({ owner }) => owner === 1)).toBe(true)
    })

    it('writes a name no larger than the largest size, however vast its space', () => {
      const vast = gridOf(200, 200, () => 0)
      const { placed } = placeNames(vast.owners, 200, 200, [{ owner: 0, text: 'AB' }], monospace, {
        ...OPTIONS,
        maxSize: 12,
      })
      expect(placed[0]?.size).toBe(12)
    })

    it('lists the names largest first', () => {
      const unequal = gridOf(90, 30, (x, y) => (x < 60 ? 0 : y < 10 ? 1 : -1))
      const { placed } = placeNames(
        unequal.owners,
        90,
        30,
        [
          { owner: 1, text: 'SMALL' },
          { owner: 0, text: 'LARGE' },
        ],
        monospace,
        OPTIONS
      )
      expect(placed.map(({ owner }) => owner)).toEqual([0, 1])
    })

    it('names an owner in every piece its name fits in, the largest first', () => {
      const islands = gridOf(70, 20, (x) => (x < 10 ? 0 : x >= 20 ? 0 : -1))
      const { placed } = placeNames(
        islands.owners,
        70,
        20,
        [{ owner: 0, text: 'ISLES' }],
        monospace,
        OPTIONS
      )
      expect(placed).toHaveLength(2)
      expect(placed[0]?.glyphs.every(({ x }) => x >= 20)).toBe(true)
      expect(placed[1]?.glyphs.every(({ x }) => x < 10)).toBe(true)
      for (const name of placed) expect(keepsClear(islands, name, OPTIONS.margin)).toBe(true)
    })

    it('leaves out a piece too small for the name, and names the others', () => {
      // A piece one cell wide, where no letter of size 2 stands, beside a large one.
      const islands = gridOf(70, 20, (x) => (x < 1 ? 0 : x >= 20 ? 0 : -1))
      const { placed, tooSmall } = placeNames(
        islands.owners,
        70,
        20,
        [{ owner: 0, text: 'ISLES' }],
        monospace,
        { ...OPTIONS, minSize: 2 }
      )
      expect(placed).toHaveLength(1)
      expect(tooSmall).toEqual([])
    })
  })

  describe('the comparison', () => {
    /** A thick band on the diagonal. */
    const DIAGONAL = gridOf(70, 70, (x, y) => (Math.abs(x - y) < 14 ? 0 : -1))

    it('centres a name on the country’s centre of mass', () => {
      // A band with a block below its west end: the mass leans west.
      const leaning = gridOf(60, 16, (x, y) => (y < 8 || x < 20 ? 0 : -1))
      const { placed } = placeNames(
        leaning.owners,
        60,
        16,
        [{ owner: 0, text: 'ABCDEF' }],
        monospace,
        OPTIONS
      )
      const xs = (placed[0]?.glyphs ?? []).map(({ x }) => x)
      const middle = (Math.min(...xs) + Math.max(...xs)) / 2
      // The cells' mean column: 60 × 8 of the band, 20 × 8 of the block.
      const centre = (60 * 8 * 29.5 + 20 * 8 * 9.5) / (60 * 8 + 20 * 8)
      expect(Math.abs(middle - centre)).toBeLessThan(3)
    })

    it('comes up to the border when touching it weighs nothing and makes the name larger', () => {
      const kept = placeNames(BAND.owners, 60, 12, [{ owner: 0, text: 'AB' }], monospace, OPTIONS)
      const free = placeNames(
        BAND.owners,
        60,
        12,
        [{ owner: 0, text: 'AB' }],
        monospace,
        weighing({ border: 0 })
      )
      expect(free.placed[0]?.size ?? Number.NaN).toBeGreaterThan(kept.placed[0]?.size ?? Number.NaN)
    })

    it('lays a name level when a slant weighs heavily, along the country when it weighs nothing', () => {
      const name = [{ owner: 0, text: 'ABCDEF' }]
      const level = placeNames(DIAGONAL.owners, 70, 70, name, monospace, weighing({ slant: 10 }))
      const along = placeNames(DIAGONAL.owners, 70, 70, name, monospace, weighing({ slant: 0 }))
      expect(level.placed[0]?.glyphs.every(({ angle }) => angle === 0)).toBe(true)
      expect(along.placed[0]?.glyphs.some(({ angle }) => Math.abs(angle) > 0.5)).toBe(true)
    })

    it('never sets a name over two lines along a slant, straight across only', () => {
      // On the diagonal, two lines along it would make the name largest; they are never tried.
      const { placed } = placeNames(
        DIAGONAL.owners,
        70,
        70,
        [{ owner: 0, text: 'ABCDEF GHIJKL' }],
        monospace,
        weighing({ twoLines: 0, slant: 0, bend: 0 })
      )
      const name = placed[0]
      if (name === undefined) throw new Error('not placed')
      const tilted = name.glyphs.some(({ angle }) => angle !== 0)
      expect(tilted ? spread(name) : 0).toBeLessThan(0.5)
    })
  })

  describe('two lines', () => {
    /** A square too narrow for "AAAA BBBB" on one line at a good size. */
    const SQUARE = gridOf(20, 20, () => 0)
    /** Two words. */
    const TWO_WORDS = [{ owner: 0, text: 'AAAA BBBB' }]
    /** Two lines free of charge. */
    const FREE = { ...OPTIONS, weights: { ...OPTIONS.weights, twoLines: 0 } }

    it('breaks a name over two lines when they make it larger and cost nothing, the first above', () => {
      const one = placeNames(SQUARE.owners, 20, 20, TWO_WORDS, monospace, OPTIONS).placed[0]
      const two = placeNames(SQUARE.owners, 20, 20, TWO_WORDS, monospace, FREE).placed[0]
      if (two === undefined) throw new Error('not placed')
      const firstY = two.glyphs.slice(0, 4).reduce((sum, { y }) => sum + y, 0) / 4
      const secondY = two.glyphs.slice(5).reduce((sum, { y }) => sum + y, 0) / 4
      expect(spread(two)).toBeGreaterThan(1)
      expect(firstY).toBeLessThan(secondY)
      expect(two.size).toBeGreaterThan(one?.size ?? Number.NaN)
    })

    it('keeps a name on one line when two lines weigh heavily', () => {
      const { placed } = placeNames(SQUARE.owners, 20, 20, TWO_WORDS, monospace, OPTIONS)
      expect(spread(placed[0])).toBeLessThan(0.5)
    })

    it('keeps a name of one word on one line, whatever two lines cost', () => {
      const { placed } = placeNames(
        SQUARE.owners,
        20,
        20,
        [{ owner: 0, text: 'AAAABBBB' }],
        monospace,
        FREE
      )
      expect(spread(placed[0])).toBeLessThan(0.5)
    })

    it('spaces two lines by their own reach, not by the whole name’s', () => {
      const room = gridOf(30, 20, () => 0)
      const { placed } = placeNames(
        room.owners,
        30,
        20,
        [{ owner: 0, text: 'AAAA BBBp' }],
        descending,
        FREE
      )
      const name = placed[0]
      const [first, second] = [name?.glyphs[0], name?.glyphs[5]]
      if (name === undefined || first === undefined || second === undefined)
        throw new Error('not placed')
      // Across the line: the second baseline lies below the first by the second line's ascent and the gap,
      // 1 + 0.15 × 1.3 letters — never by the whole name's height and the gap, 1.3 × 1.15.
      const across =
        (first.x - second.x) * Math.sin(first.angle) - (first.y - second.y) * Math.cos(first.angle)
      expect(across / name.size).toBeCloseTo(1 + 0.15 * 1.3, 2)
    })

    it('places the space it breaks at, so every letter keeps its place', () => {
      const { placed } = placeNames(SQUARE.owners, 20, 20, TWO_WORDS, monospace, FREE)
      expect(placed[0]?.glyphs).toHaveLength(9)
    })
  })

  describe('managed errors', () => {
    it('refuses an overflow below zero, which would be a margin', () => {
      expect(() =>
        placeNames(BAND.owners, 60, 12, [{ owner: 0, text: 'AB' }], monospace, {
          ...OPTIONS,
          overflow: -1,
        })
      ).toThrow(/an overflow of -1 cells/)
    })

    it('leaves a name that fits only under the smallest size for a closer zoom', () => {
      const { placed, tooSmall } = placeNames(
        BAND.owners,
        60,
        12,
        [{ owner: 0, text: 'ABCDEF' }],
        monospace,
        { ...OPTIONS, minSize: 20 }
      )
      expect(placed).toEqual([])
      expect(tooSmall).toEqual([0])
    })

    it('writes a name with no margin where the margin leaves no room, rather than leave it out', () => {
      const sliver = gridOf(30, 2, () => 0)
      const { placed, tooSmall } = placeNames(
        sliver.owners,
        30,
        2,
        [{ owner: 0, text: 'AB' }],
        monospace,
        OPTIONS
      )
      expect([placed.length, tooSmall]).toEqual([1, []])
    })

    it('leaves a space too thin for any letter for a closer zoom', () => {
      const sliver = gridOf(30, 1, () => 0)
      const { tooSmall } = placeNames(sliver.owners, 30, 1, [{ owner: 0, text: 'AB' }], monospace, {
        ...OPTIONS,
        minSize: 2,
      })
      expect(tooSmall).toEqual([0])
    })

    it('returns an owner with no cell at this level as absent, and places nothing for it', () => {
      const result = placeNames(
        BAND.owners,
        60,
        12,
        [{ owner: 9, text: 'HIDDEN' }],
        monospace,
        OPTIONS
      )
      expect(result).toEqual({ placed: [], tooSmall: [], absent: [9] })
    })

    it('refuses an owner asked for twice, whose two names would lie on each other', () => {
      const twice = [
        { owner: 0, text: 'ONE' },
        { owner: 0, text: 'TWO' },
      ]
      expect(() => placeNames(BAND.owners, 60, 12, twice, monospace, OPTIONS)).toThrow(
        /owner 0 is asked for twice/
      )
    })

    it('refuses an empty name', () => {
      expect(() =>
        placeNames(BAND.owners, 60, 12, [{ owner: 0, text: '' }], monospace, OPTIONS)
      ).toThrow(/empty name/)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a measure with an advance too few for the text', () => {
      expect(() =>
        placeNames(BAND.owners, 60, 12, [{ owner: 0, text: 'ABC' }], short, OPTIONS)
      ).toThrow(/3 letters and was measured with 2 advances/)
    })

    it('refuses a measure with no height', () => {
      expect(() =>
        placeNames(BAND.owners, 60, 12, [{ owner: 0, text: 'AB' }], flat, OPTIONS)
      ).toThrow(/no length or no height/)
    })

    it('refuses a measure whose advances are not numbers', () => {
      expect(() =>
        placeNames(BAND.owners, 60, 12, [{ owner: 0, text: 'AB' }], broken, OPTIONS)
      ).toThrow(/no length or no height/)
    })

    it('refuses a grid whose size is not width × height', () => {
      expect(() => placeNames(new Int32Array(3), 2, 2, [], monospace, OPTIONS)).toThrow(
        /is not 2 × 2/
      )
    })
  })

  describe('edge cases', () => {
    it('keeps the margin from the map’s frame as from a border', () => {
      const { placed } = placeNames(
        BAND.owners,
        60,
        12,
        [{ owner: 0, text: 'AB' }],
        monospace,
        OPTIONS
      )
      const name = placed[0]
      if (name === undefined) throw new Error('not placed')
      expect(keepsClear(BAND, name, OPTIONS.margin)).toBe(true)
    })

    it('measures each name once, with its text', () => {
      const measure = vi.fn(monospace)
      placeNames(BAND.owners, 60, 12, [{ owner: 0, text: 'ABC' }], measure, OPTIONS)
      expect(measure.mock.calls).toEqual([['ABC']])
    })

    it('places nothing when no name is asked', () => {
      expect(placeNames(BAND.owners, 60, 12, [], monospace, OPTIONS)).toEqual({
        placed: [],
        tooSmall: [],
        absent: [],
      })
    })
  })
})
