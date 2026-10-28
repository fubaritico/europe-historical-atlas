import { describe, expect, it, vi } from 'vitest'

import { placeNames } from './namePlacement'

import type { MeasureName, NamePlacementOptions, PlacedName } from './namePlacement'

/** Every letter one unit wide and one unit tall — a monospace stand-in for the canvas. */
const monospace: MeasureName = (text) => ({ advances: Array.from(text, () => 1), height: 1 })

/** A margin of one cell, and any size worth writing. */
const OPTIONS: NamePlacementOptions = { margin: 1, minSize: 0.5 }

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
 * placement promises, checked without any of its own arithmetic. A letter's centre may sit between the
 * samples the placement read, so a quarter of a cell is allowed.
 * @param grid - the grid
 * @param name - the name placed
 * @param margin - the margin promised
 * @returns whether every letter keeps it
 */
function keepsClear(grid: Grid, name: PlacedName, margin: number): boolean {
  return name.glyphs.every(
    ({ x, y }) => clearance(grid, name.owner, x, y) >= margin + name.size / 2 - 0.25
  )
}

/** A band 60 cells long and 12 high, all of owner 0. */
const BAND = gridOf(60, 12, () => 0)

const short: MeasureName = () => ({ advances: [1, 1], height: 1 })

const flat: MeasureName = (text) => ({ advances: Array.from(text, () => 1), height: 0 })

const broken: MeasureName = (text) => ({
  advances: Array.from(text, () => Number.NaN),
  height: 1,
})

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

    it('names an owner in pieces in its largest one', () => {
      const islands = gridOf(70, 20, (x) => (x < 10 ? 0 : x >= 20 ? 0 : -1))
      const { placed } = placeNames(
        islands.owners,
        70,
        20,
        [{ owner: 0, text: 'ISLES' }],
        monospace,
        OPTIONS
      )
      expect(placed[0]?.glyphs.every(({ x }) => x >= 20)).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('leaves a name that fits only under the smallest size for a closer zoom', () => {
      const { placed, tooSmall } = placeNames(
        BAND.owners,
        60,
        12,
        [{ owner: 0, text: 'ABCDEF' }],
        monospace,
        { margin: 1, minSize: 20 }
      )
      expect(placed).toEqual([])
      expect(tooSmall).toEqual([0])
    })

    it('leaves a space too thin for its margin for a closer zoom', () => {
      const sliver = gridOf(30, 2, () => 0)
      const { tooSmall } = placeNames(
        sliver.owners,
        30,
        2,
        [{ owner: 0, text: 'AB' }],
        monospace,
        OPTIONS
      )
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
