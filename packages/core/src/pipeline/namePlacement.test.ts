import { describe, expect, it, vi } from 'vitest'

import { createOccupancy, pieceTag } from './nameOccupancy'
import { placeNames } from './namePlacement'

import type { MeasureName, NamePlacementOptions, PlacedName } from './namePlacement'

/** Every letter one unit wide, reaching one unit above its baseline and none below — a monospace stand-in for the canvas. */
const monospace: MeasureName = (text) => ({
  advances: Array.from(text, () => 1),
  ascent: 1,
  descent: 0,
})

/**
 * The construction as the atlas starts from it, any size worth writing, no bite into a neighbour, straits of four cells,
 * and no far realm named by its size alone — unless a test says otherwise.
 */
const OPTIONS: NamePlacementOptions = {
  heightShare: 0.6,
  cover: 0.75,
  trackingMost: 0.6,
  minSize: 0.5,
  maxSize: 1000,
  longMinSize: 0.5,
  neighbourBite: 0,
  strait: 4,
  farShare: 0.2,
  farCells: 1e9,
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
 * Place one name, or several, on a grid.
 * @param grid - the grid
 * @param names - the names, by owner
 * @param options - the options, the tests' own unless given
 * @returns the placement
 */
function place(
  grid: Grid,
  names: readonly { owner: number; text: string; shorter?: string }[],
  options: NamePlacementOptions = OPTIONS
): ReturnType<typeof placeNames> {
  return placeNames(grid.owners, grid.width, grid.height, names, monospace, options)
}

/**
 * How far a run of points slants from the horizontal, from its first to its last, in radians.
 * @param points - the points, in order
 * @returns the slant, from nought to a right angle; `NaN` for fewer than two points
 */
function slantOf(points: readonly { readonly x: number; readonly y: number }[]): number {
  const [first, last] = [points[0], points.at(-1)]
  if (first === undefined || last === undefined || points.length < 2) return Number.NaN
  return Math.abs(Math.atan2(last.y - first.y, last.x - first.x))
}

/**
 * The one name placed for an owner.
 * @param grid - the grid
 * @param text - the name
 * @param options - the options
 * @returns it
 */
function only(grid: Grid, text: string, options: NamePlacementOptions = OPTIONS): PlacedName {
  const placed = place(grid, [{ owner: 0, text }], options).placed[0]
  if (placed === undefined) throw new Error(`"${text}" was not placed`)
  return placed
}

/**
 * How far a name turns from its first letter to its last, in degrees.
 * @param name - the name
 * @returns the turn
 */
function turnOf(name: PlacedName): number {
  const first = name.glyphs[0]?.angle ?? 0
  const last = name.glyphs.at(-1)?.angle ?? 0
  return (Math.abs(Math.atan2(Math.sin(last - first), Math.cos(last - first))) * 180) / Math.PI
}

/**
 * The distance between two neighbouring letters' places.
 * @param name - the name
 * @returns it, from the first letter to the second
 */
function step(name: PlacedName): number {
  const [a, b] = name.glyphs
  return a === undefined || b === undefined ? Number.NaN : Math.hypot(b.x - a.x, b.y - a.y)
}

/** A measure one advance short of its text. */
const tooFew: MeasureName = () => ({ advances: [1], ascent: 1, descent: 0 })

/** A measure with no height. */
const flat: MeasureName = (text) => ({ advances: Array.from(text, () => 1), ascent: 0, descent: 0 })

/** A measure whose advances are not numbers. */
const broken: MeasureName = (text) => ({
  advances: Array.from(text, () => Number.NaN),
  ascent: 1,
  descent: 0,
})

/** A band 60 cells long and 12 high, all of owner 0. */
const BAND = gridOf(60, 12, () => 0)

// Rebuilt on 2026-10-29 from « The gap to the reference » (`files/plans/atlas/country-names.md`): one line, its height
// from the country's thickness, its length from the spacing of its letters.
describe('placeNames', () => {
  describe('happy path', () => {
    it('writes a name along a band, its letters as tall as a share of the band’s thickness', () => {
      const name = only(BAND, 'AB')
      expect(name.size).toBeGreaterThan(0.6 * 12 - 1)
      expect(name.size).toBeLessThanOrEqual(0.6 * 12)
      expect(name.glyphs.every(({ y }) => Math.abs(y - (name.glyphs[0]?.y ?? 0)) < 1e-6)).toBe(true)
    })

    it('places one letter per code point, in reading order', () => {
      const name = only(BAND, 'ABCD')
      const columns = name.glyphs.map(({ x }) => x)
      expect(columns).toHaveLength(4)
      expect([...columns].sort((a, b) => a - b)).toEqual(columns)
    })

    it('centres the name in its space', () => {
      const name = only(BAND, 'ABCD')
      const middle = name.glyphs.reduce((sum, { x }) => sum + x, 0) / name.glyphs.length
      expect(middle).toBeCloseTo(29.5, 0)
    })
  })

  describe('variants', () => {
    it('spaces a name’s letters so it covers its share of the line', () => {
      const name = only(BAND, 'ABCDEF')
      const first = name.glyphs[0]?.x ?? 0
      const last = name.glyphs.at(-1)?.x ?? 0
      // From the first letter's left side to the last's right side: three quarters of the band's 60 cells.
      expect(last - first + name.size).toBeCloseTo(0.75 * 60, 0)
    })

    it('spaces a short name in a long country no more than the most spacing allowed', () => {
      const name = only(
        gridOf(200, 12, () => 0),
        'ABCD'
      )
      expect(step(name)).toBeCloseTo((1 + OPTIONS.trackingMost) * name.size, 3)
    })

    it('sets a long name smaller so it covers nine tenths of its line at most, unspaced', () => {
      const name = only(BAND, 'ABCDEFGHIJ')
      expect(name.size).toBeCloseTo((0.9 * 60) / 10, 1)
      expect(step(name)).toBeCloseTo(name.size, 3)
    })

    it('writes a thicker country’s name taller', () => {
      const thin = only(
        gridOf(80, 12, () => 0),
        'AB'
      ).size
      const thick = only(
        gridOf(80, 20, () => 0),
        'AB'
      ).size
      expect(thick / thin).toBeCloseTo(20 / 12, 0)
    })

    it('reads a name up a standing band, from the bottom', () => {
      const name = only(
        gridOf(12, 60, () => 0),
        'ABCD'
      )
      expect(name.glyphs[0]?.y ?? 0).toBeGreaterThan(name.glyphs.at(-1)?.y ?? 0)
    })

    it('bends a name along an arch', () => {
      const arch = gridOf(80, 44, (x, y) => {
        const r = Math.hypot(x - 40, y - 42)
        return r >= 22 && r <= 34 && y <= 42 ? 0 : -1
      })
      expect(turnOf(only(arch, 'ABCDEF'))).toBeGreaterThan(20)
    })

    // The dev, 29/10: the Holy Roman Empire, England and Novgorod were written straight across, small — « au moins sur
    // un arc […] ou sur un arc mais en diagonale ».
    it('writes a compact country standing upright on a diagonal, never straight across nor standing', () => {
      const upright = gridOf(40, 50, (x, y) =>
        ((x - 20) / 11) ** 2 + ((y - 25) / 13) ** 2 <= 1 ? 0 : -1
      )
      const slant = slantOf(only(upright, 'ABCDEF').glyphs)
      expect([slant > Math.PI / 8, slant <= Math.PI / 4 + 1e-6]).toEqual([true, true])
    })

    it('names two neighbours each in its own country, every letter on its own side', () => {
      const pair = gridOf(80, 12, (x) => (x < 40 ? 0 : 1))
      const { placed } = place(pair, [
        { owner: 0, text: 'AB' },
        { owner: 1, text: 'CD' },
      ])
      const west = placed.find(({ owner }) => owner === 0)
      const east = placed.find(({ owner }) => owner === 1)
      const half = (west?.size ?? 0) / 2
      expect(west?.glyphs.every(({ x }) => x + half <= 39.5 + 0.25)).toBe(true)
      expect(east?.glyphs.every(({ x }) => x - half >= 39.5 - 0.25)).toBe(true)
    })

    it('moves a suzerain’s name into what its shown vassal leaves it', () => {
      const shown = gridOf(60, 12, (x) => (x >= 40 ? 1 : 0))
      const name = only(shown, 'ABCD')
      const middle = name.glyphs.reduce((sum, { x }) => sum + x, 0) / name.glyphs.length
      expect(middle).toBeCloseTo(19.5, 0)
    })

    it('writes a name no larger than the largest size, however thick its country', () => {
      expect(
        only(
          gridOf(200, 120, () => 0),
          'AB',
          { ...OPTIONS, maxSize: 7 }
        ).size
      ).toBe(7)
    })

    it('lists the names largest first', () => {
      const two = gridOf(120, 30, (x, y) => (x < 60 ? 0 : y < 10 ? 1 : -1))
      const { placed } = place(two, [
        { owner: 1, text: 'AB' },
        { owner: 0, text: 'AB' },
      ])
      expect(placed.map(({ owner }) => owner)).toEqual([0, 1])
    })
  })

  // Axis C: a country's land with the narrow seas inside it is one place to name.
  describe('realms', () => {
    /** Two blocks of one country parted by a sea two cells wide. */
    const PARTED = gridOf(62, 12, (x) => (x === 30 || x === 31 ? -1 : 0))

    it('names a country once across a strait narrower than the widest spanned', () => {
      expect(place(PARTED, [{ owner: 0, text: 'ABCD' }]).placed).toHaveLength(1)
    })

    it('writes the name across the strait, its letters on both shores', () => {
      const name = only(PARTED, 'ABCDEF')
      expect(name.glyphs.some(({ x }) => x < 30)).toBe(true)
      expect(name.glyphs.some(({ x }) => x > 31)).toBe(true)
    })

    it('names each shore apart when the strait is wider than the widest spanned', () => {
      expect(
        place(PARTED, [{ owner: 0, text: 'AB' }], { ...OPTIONS, strait: 1 }).placed
      ).toHaveLength(2)
    })

    it('leaves a far islet unnamed, under its share of the country’s largest', () => {
      const islet = gridOf(100, 30, (x, y) => (x < 60 || (x >= 90 && y < 4 && x < 94) ? 0 : -1))
      expect(place(islet, [{ owner: 0, text: 'AB' }]).placed).toHaveLength(1)
    })

    it('names a far realm as large as a country of its own, whatever its share', () => {
      const far = gridOf(140, 40, (x, y) => (x < 80 || (x >= 110 && y < 10) ? 0 : -1))
      const { placed } = place(far, [{ owner: 0, text: 'AB' }], {
        ...OPTIONS,
        farShare: 0.5,
        farCells: 250,
      })
      expect(placed.map(({ piece }) => piece).sort()).toEqual([0, 1])
    })
  })

  describe('the neighbours', () => {
    // A band twelve cells thick, a neighbour cutting four rows into its top in the middle: the letters, as tall as the
    // band allows, run into the neighbour there, and may bite into it by as much as the bite allows.
    const HEMMED = gridOf(80, 20, (x, y) => {
      const notch = x >= 35 && x < 45 && y >= 4 && y < 8
      if (notch) return 1
      return y >= 4 && y < 16 ? 0 : -1
    })

    // A band with a neighbour's enclave across its middle, a strip of the band left above and below it: the line
    // through the band crosses it.
    const ENCLAVE = gridOf(80, 20, (x, y) => {
      if (x >= 20 && x < 26 && y >= 6 && y < 14) return 1
      return y >= 4 && y < 16 ? 0 : -1
    })

    it('lets no letter into a neighbour deeper than the bite, however tall the name', () => {
      const { glyphs, size } = only(ENCLAVE, 'ABCDEF', { ...OPTIONS, neighbourBite: 1 })
      expect(
        glyphs.every(({ x }) => x - size / 2 >= 26 - 1 - 1e-6 || x + size / 2 <= 20 + 1 + 1e-6)
      ).toBe(true)
    })

    it('writes a name on the longest stretch of its line a neighbour leaves', () => {
      const { glyphs } = only(ENCLAVE, 'ABCDEF')
      const middle = glyphs.reduce((sum, { x }) => sum + x, 0) / glyphs.length
      expect(middle).toBeCloseTo((26 + 80) / 2, -0.5)
    })

    it('lets a name bite into a neighbour by the bite allowed, larger for it', () => {
      const free = place(HEMMED, [{ owner: 0, text: 'ABC' }]).placed[0]?.size ?? 0
      const biting = place(HEMMED, [{ owner: 0, text: 'ABC' }], { ...OPTIONS, neighbourBite: 2 })
        .placed[0]
      expect(biting?.size ?? 0).toBeGreaterThan(free)
    })
  })

  describe('the names already written', () => {
    it('keeps a name off the cells another realm’s name covers, when the level shares its cells', () => {
      const pair = gridOf(80, 12, (x) => (x < 40 ? 0 : 1))
      const occupancy = createOccupancy(80, 12)
      occupancy.cells.fill(pieceTag(0, 0), 0, 80 * 12)
      const { placed } = placeNames(
        pair.owners,
        80,
        12,
        [{ owner: 1, text: 'AB' }],
        monospace,
        OPTIONS,
        occupancy
      )
      expect(placed).toHaveLength(0)
    })

    // The dev, 29/10: « décaler le nom sur la partie de leur terre que les petits laissent libre, plutôt que le
    // rétrécir sur place ».
    it('moves a name to the land another name leaves free, as tall as that land alone allows', () => {
      // A band twenty rows thick, the top nine covered by another piece's name along their whole length.
      const thick = gridOf(80, 26, (_, y) => (y >= 3 && y < 23 ? 0 : -1))
      const occupancy = createOccupancy(80, 26)
      for (let y = 3; y < 12; y += 1) occupancy.cells.fill(pieceTag(1, 0), y * 80, (y + 1) * 80)
      const [moved] = placeNames(
        thick.owners,
        80,
        26,
        [{ owner: 0, text: 'ABCD' }],
        monospace,
        OPTIONS,
        occupancy
      ).placed
      // The free rows alone, eleven of them, with nothing written over them.
      const alone = only(
        gridOf(80, 17, (_, y) => (y >= 3 && y < 14 ? 0 : -1)),
        'ABCD'
      )
      expect([moved?.glyphs.every(({ y }) => y >= 12), moved?.size]).toEqual([
        true,
        expect.closeTo(alone.size, 0),
      ])
    })

    // The Strathclyde, 29/10: in the dev's atlas the free land alone gave it a worse line than its whole land.
    it('keeps the line over the whole land when the free land would set the name smaller', () => {
      // The band's right part covered by another name over two thirds of its height: the free land is an L, and its
      // arc runs worse than the whole band's middle line, cut at the cover's edge to columns 0 to 29.
      const thick = gridOf(80, 26, (_, y) => (y >= 3 && y < 23 ? 0 : -1))
      const occupancy = createOccupancy(80, 26)
      for (let y = 11; y < 21; y += 1)
        occupancy.cells.fill(pieceTag(1, 0), y * 80 + 30, (y + 1) * 80)
      const [kept] = placeNames(
        thick.owners,
        80,
        26,
        [{ owner: 0, text: 'ABCDEFGH' }],
        monospace,
        OPTIONS,
        occupancy
      ).placed
      // Thirty cells of line, the most a long name covers (0.9), eight letters of one unit.
      expect(kept?.size).toBeCloseTo((0.9 * 30) / 8, 1)
    })

    it('marks the names it places in the shared cells, with its realm’s tag', () => {
      const occupancy = createOccupancy(60, 12)
      placeNames(BAND.owners, 60, 12, [{ owner: 0, text: 'AB' }], monospace, OPTIONS, occupancy)
      expect(occupancy.cells.includes(pieceTag(0, 0))).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('leaves a name that fits only under the smallest size for a closer zoom', () => {
      const { placed, tooSmall } = place(BAND, [{ owner: 0, text: 'AB' }], {
        ...OPTIONS,
        minSize: 20,
      })
      expect([placed, tooSmall]).toEqual([[], [0]])
    })

    it('writes the shorter name where the full one does not reach its smallest size', () => {
      const placed = place(BAND, [{ owner: 0, text: 'ABCDEFGHIJKLMNOPQRST', shorter: 'AB' }], {
        ...OPTIONS,
        longMinSize: 4,
      }).placed[0]
      expect(placed?.text).toBe('AB')
    })

    it('returns an owner with no cell at this level as absent, and places nothing for it', () => {
      const { placed, absent } = place(BAND, [{ owner: 7, text: 'AB' }])
      expect([placed, absent]).toEqual([[], [7]])
    })

    it('refuses an owner asked for twice, whose two names would lie on each other', () => {
      expect(() =>
        place(BAND, [
          { owner: 0, text: 'AB' },
          { owner: 0, text: 'CD' },
        ])
      ).toThrow(/asked for twice/)
    })

    it('refuses an empty name', () => {
      expect(() => place(BAND, [{ owner: 0, text: '' }])).toThrow(/empty name/)
    })

    it('refuses a bite into a neighbour below zero', () => {
      expect(() =>
        place(BAND, [{ owner: 0, text: 'AB' }], { ...OPTIONS, neighbourBite: -1 })
      ).toThrow(/bite/)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a measure with an advance too few for the text', () => {
      expect(() =>
        placeNames(BAND.owners, 60, 12, [{ owner: 0, text: 'AB' }], tooFew, OPTIONS)
      ).toThrow(/2 letters/)
    })

    it('refuses a measure with no height', () => {
      expect(() =>
        placeNames(BAND.owners, 60, 12, [{ owner: 0, text: 'AB' }], flat, OPTIONS)
      ).toThrow(/no length or no height/)
    })

    it('refuses a measure whose advances are not numbers', () => {
      expect(() =>
        placeNames(BAND.owners, 60, 12, [{ owner: 0, text: 'AB' }], broken, OPTIONS)
      ).toThrow(/no length/)
    })

    it('refuses a grid whose size is not width × height', () => {
      expect(() => placeNames(BAND.owners, 61, 12, [], monospace, OPTIONS)).toThrow(
        /is not 61 × 12/
      )
    })
  })

  describe('edge cases', () => {
    it('places nothing when no name is asked', () => {
      expect(place(BAND, [])).toEqual({ placed: [], tooSmall: [], absent: [] })
    })

    it('measures each text once', () => {
      const measure = vi.fn(monospace)
      placeNames(BAND.owners, 60, 12, [{ owner: 0, text: 'AB', shorter: 'A' }], measure, OPTIONS)
      expect(measure.mock.calls.map(([text]) => text)).toEqual(['AB', 'A'])
    })

    it('never spills past the map’s frame', () => {
      const name = only(BAND, 'AB')
      const half = name.size / 2
      expect(name.glyphs.every(({ y }) => y - name.size >= -0.25 && y <= 11.75)).toBe(true)
      expect(name.glyphs.every(({ x }) => x - half >= -0.75 && x + half <= 60.25)).toBe(true)
    })
  })
})
