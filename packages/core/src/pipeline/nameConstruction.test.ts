import { describe, expect, it } from 'vitest'

import {
  COMPACT_ASPECT,
  COMPACT_SLANT,
  constructName,
  nameLineOf,
  thicknessAlong,
} from './nameConstruction'
import { fittingOf, lineLength } from './nameFit'
import { ownerRealms } from './nameRealm'

import type { ConstructionOptions } from './nameConstruction'
import type { Fitting } from './nameFit'

/** The construction as the atlas starts from it, any size worth writing. */
const OPTIONS: ConstructionOptions = {
  heightShare: 0.6,
  cover: 0.75,
  trackingMost: 0.6,
  minSize: 0.5,
  maxSize: 1000,
}

/**
 * A country's realm, prepared for fitting.
 * @param width - the grid's columns
 * @param height - its rows
 * @param inside - whether a cell is the country's
 * @param neighbour - whether a cell is a neighbour's
 * @param strait - the widest strait a realm is gathered across, in cells
 * @returns the realm's fitting
 */
function realm(
  width: number,
  height: number,
  inside: (x: number, y: number) => boolean,
  neighbour: (x: number, y: number) => boolean = () => false,
  strait = 0
): Fitting {
  const owners = new Int32Array(width * height)
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      owners[y * width + x] = inside(x, y) ? 0 : neighbour(x, y) ? 1 : -1
  const space = ownerRealms(owners, width, height, {
    strait,
    farShare: 0,
    farCells: 0,
    ring: 4,
  }).get(0)?.[0]
  if (space === undefined) throw new Error('no realm')
  return fittingOf(space)
}

/** A band 60 cells long and 12 high, in the sea. */
const BAND = realm(70, 22, (x, y) => x >= 5 && x < 65 && y >= 5 && y < 17)

/**
 * Whether a cell is in the notch a neighbour cuts into the band's top.
 * @param x - the column
 * @param y - the row
 * @returns whether it is
 */
const notch = (x: number, y: number): boolean => x >= 30 && x < 40 && y < 10

/** A name of four letters, each one unit wide and tall. */
const FOUR = { length: 4, height: 1, letters: 4 }

// Axes A, B, D of « The gap to the reference » (29/10): one construction, the height from the thickness, the length
// from the spacing, one line.
describe('constructName', () => {
  describe('happy path', () => {
    it('sets a name as tall as a share of its realm’s thickness', () => {
      const set = constructName(BAND, FOUR, OPTIONS)
      expect(set?.size).toBeCloseTo(
        0.6 * thicknessAlong(BAND, set?.line ?? { points: [], lengths: [] }),
        5
      )
    })

    it('spaces its letters to cover its share of the line, no more than the most spacing', () => {
      const set = constructName(BAND, { length: 6, height: 1, letters: 6 }, OPTIONS)
      if (set === null) throw new Error('not set')
      const covered = (6 + set.tracking * 5) * set.size
      expect(covered).toBeCloseTo(0.75 * lineLength(set.line), 3)
      expect(set.tracking).toBeLessThanOrEqual(OPTIONS.trackingMost)
    })
  })

  describe('variants', () => {
    it('stops spacing a short name at the most spacing allowed', () => {
      expect(constructName(BAND, { length: 2, height: 1, letters: 2 }, OPTIONS)?.tracking).toBe(
        OPTIONS.trackingMost
      )
    })

    it('sets a long name smaller to cover nine tenths of its line, unspaced', () => {
      const set = constructName(BAND, { length: 30, height: 1, letters: 30 }, OPTIONS)
      if (set === null) throw new Error('not set')
      expect([set.tracking, set.size * 30]).toEqual([
        0,
        expect.closeTo(0.9 * lineLength(set.line), 3),
      ])
    })

    // The panel's three sliders reach the construction only through its options.
    it('sets the letters in proportion to the height share', () => {
      const lower = constructName(BAND, FOUR, { ...OPTIONS, heightShare: 0.3 })?.size ?? Number.NaN
      const higher = constructName(BAND, FOUR, OPTIONS)?.size ?? Number.NaN
      expect(lower / higher).toBeCloseTo(0.5, 5)
    })

    it('spaces the letters to the cover share asked', () => {
      const set = constructName(BAND, FOUR, { ...OPTIONS, cover: 0.5 })
      if (set === null) throw new Error('not set')
      expect((4 + set.tracking * 3) * set.size).toBeCloseTo(0.5 * lineLength(set.line), 3)
    })

    it('stops spacing a short name at the most spacing asked', () => {
      expect(
        constructName(BAND, { length: 2, height: 1, letters: 2 }, { ...OPTIONS, trackingMost: 0.3 })
          ?.tracking
      ).toBe(0.3)
    })

    it('never spaces a name of one letter', () => {
      expect(constructName(BAND, { length: 1, height: 1, letters: 1 }, OPTIONS)?.tracking).toBe(0)
    })

    it('sets a name smaller where a neighbour cuts into its realm', () => {
      const hemmed = realm(
        70,
        22,
        (x, y) => x >= 5 && x < 65 && y >= 5 && y < 17 && !notch(x, y),
        (x, y) => notch(x, y) && y >= 2
      )
      const free = constructName(BAND, FOUR, OPTIONS)?.size ?? 0
      expect(constructName(hemmed, FOUR, OPTIONS)?.size ?? 0).toBeLessThan(free)
    })
  })

  describe('managed errors', () => {
    it('sets no name that fits only under the smallest size', () => {
      expect(constructName(BAND, FOUR, { ...OPTIONS, minSize: 50 })).toBeNull()
    })
  })

  // L4: N/A — `namePlacement` checks the measure before asking.

  describe('edge cases', () => {
    it('sets no name in a realm of one cell, which gives no line', () => {
      expect(
        constructName(
          realm(9, 9, (x, y) => x === 4 && y === 4),
          FOUR,
          OPTIONS
        )
      ).toBeNull()
    })
  })
})

describe('nameLineOf', () => {
  it('holds a compact realm standing upright to a diagonal', () => {
    const upright = realm(40, 50, (x, y) => ((x - 20) / 11) ** 2 + ((y - 25) / 13) ** 2 <= 1)
    const points = nameLineOf(upright)?.points ?? []
    const [first, last] = [points[0], points.at(-1)]
    if (first === undefined || last === undefined) throw new Error('no line')
    const slant = Math.abs(Math.atan2(last[1] - first[1], last[0] - first[0]))
    expect(slant).toBeLessThanOrEqual(COMPACT_SLANT + 1e-6)
  })

  it('cuts the line where a neighbour crosses it, keeping the longest stretch', () => {
    const crossed = realm(
      70,
      22,
      (x, y) => x >= 5 && x < 65 && y >= 5 && y < 17 && !(x >= 20 && x < 26 && y >= 7 && y < 15),
      (x, y) => x >= 20 && x < 26 && y >= 7 && y < 15
    )
    // In the crop's cells, a ring around the realm: the grid's column 25, the enclave's last, is the crop's 24.
    const left = crossed.space.left
    const xs = nameLineOf(crossed)?.points.map(([x]) => x + left) ?? []
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([
      expect.closeTo(25.5, 5),
      expect.closeTo(64.5, 5),
    ])
  })

  it('follows a long realm’s length, past the compact aspect', () => {
    const line = nameLineOf(BAND)
    if (line === null) throw new Error('no line')
    expect(lineLength(line)).toBeGreaterThan(COMPACT_ASPECT * 12)
  })
})

const block = (x: number, y: number): boolean =>
  y >= 3 && y < 23 && ((x >= 2 && x < 14) || (x >= 50 && x < 62))

const islet = (x: number, y: number): boolean =>
  [22, 23, 31, 32, 40, 41].includes(x) && y >= 12 && y < 14

describe('thicknessAlong', () => {
  it('reads a band’s height across its middle', () => {
    const line = nameLineOf(BAND)
    if (line === null) throw new Error('no line')
    expect(thicknessAlong(BAND, line)).toBeCloseTo(12, 0)
  })

  // Denmark, 29/10: Jutland and Zealand twenty cells thick, a wide sea between them dotted with three islets — the line's
  // middle lies on the islets, the land's middle on the two blocks.
  it('reads an archipelago’s thickness on the middle of its land, not on the islets in the middle of its line', () => {
    const archipelago = realm(64, 26, (x, y) => block(x, y) || islet(x, y), undefined, 8)
    const line = nameLineOf(archipelago)
    if (line === null) throw new Error('no line')
    expect(thicknessAlong(archipelago, line)).toBeCloseTo(20, -0.5)
  })

  it('reads no thickness where the line’s middle crosses no land', () => {
    expect(
      thicknessAlong(BAND, {
        points: [
          [0, 0],
          [1, 0],
        ],
        lengths: [0, 1],
      })
    ).toBe(0)
  })
})
