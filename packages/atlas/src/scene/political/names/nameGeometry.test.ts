import { describe, expect, it } from 'vitest'

import { SHEET_PAD } from './glyphSheet'
import {
  HALO_MAX_EM,
  MAX_TILE_STEPS,
  MIN_TILE_STEPS,
  nameGeometry,
  tileSteps,
} from './nameGeometry'

import type { NameGeometryInput } from './nameGeometry'
import type { GlyphCell } from '../../../sources/mapSources'
import type { PlacedYearName } from '@europe-historical-atlas/core/pipeline/yearNames'

/** One cell, the whole sheet, half an em wide. */
const CELL: GlyphCell = { u0: 0, u1: 1, v0: 0, v1: 1, advance: 0.5 }

/** The steps of a tile of the names below, all of size 2. */
const STEPS = tileSteps(2)

/** Vertices per tile. */
const VERTICES = (STEPS + 1) ** 2

/**
 * A name of one letter, straight, at a place of the grid.
 * @param text - the name
 * @param angle - its line's direction
 * @returns the name, its letters one unit apart along the line
 */
function name(text: string, angle = 0): PlacedYearName {
  return {
    polity: 'p',
    text,
    form: 'short',
    piece: 0,
    size: 2,
    glyphs: Array.from(text, (_, at) => ({ x: 10 + at, y: 10, angle })),
  }
}

/**
 * The geometry's input, the grid 11 cells a side and the projection flat, `x = u`, `z = v`, `y = 0`.
 * @param names - the names
 * @returns the input
 */
function input(names: PlacedYearName[]): NameGeometryInput {
  return {
    names,
    sheet: { cells: new Map([['A', CELL]]), ascent: 0.75, descent: 0.25 },
    grid: { width: 21, height: 21 },
    draped: (u, v) => [u * 20, 0, v * 20],
    haloCells: 1,
  }
}

describe('tileSteps', () => {
  it('cuts a large letter finer than a small one, about one vertex per cell of the relief', () => {
    expect(tileSteps(4)).toBeLessThan(tileSteps(20))
    expect(tileSteps(20)).toBe(30)
  })

  it('keeps a small letter at the fewest steps, and the largest at the most', () => {
    expect([tileSteps(0.5), tileSteps(1000)]).toEqual([MIN_TILE_STEPS, MAX_TILE_STEPS])
  })
})

describe('nameGeometry', () => {
  describe('happy path', () => {
    it('lays one tile per letter, cut in steps', () => {
      const geometry = nameGeometry(input([name('AA')]))
      expect(geometry.getAttribute('position').count).toBe(2 * VERTICES)
      expect(geometry.getIndex()?.count).toBe(2 * STEPS * STEPS * 6)
    })

    // Positions are stored as Float32: five decimals, far below a cell.
    it('spans the letter’s advance and pads along its line, its foot to its top across it', () => {
      const position = nameGeometry(input([name('A')])).getAttribute('position')
      const xs = Array.from({ length: position.count }, (_, at) => position.getX(at))
      const zs = Array.from({ length: position.count }, (_, at) => position.getZ(at))
      const half = (CELL.advance / 2 + SHEET_PAD) * 2
      expect(Math.min(...xs)).toBeCloseTo(10 - half, 5)
      expect(Math.max(...xs)).toBeCloseTo(10 + half, 5)
      // Up the page is toward the north, `z` down: the top 0.75 × 2 above the baseline, the foot 0.25 × 2 below.
      expect(Math.min(...zs)).toBeCloseTo(10 - 1.5, 5)
      expect(Math.max(...zs)).toBeCloseTo(10 + 0.5, 5)
    })
  })

  describe('variants', () => {
    it('lays each name flat, at the median height of the ground under it', () => {
      // Ground rising to the east: a name's eastmost vertex stands highest.
      const rising = {
        ...input([name('AA'), { ...name('A'), glyphs: [{ x: 3, y: 3, angle: 0 }] }]),
      }
      const position = nameGeometry({
        ...rising,
        draped: (u, v) => [u * 20, u * 10, v * 20],
      }).getAttribute('position')
      const heights = (from: number, to: number): number[] =>
        Array.from({ length: to - from }, (_, at) => position.getY(from + at))
      const [first, second] = [heights(0, 2 * VERTICES), heights(2 * VERTICES, 3 * VERTICES)]
      expect(new Set(first).size).toBe(1)
      expect(new Set(second).size).toBe(1)
      // The first name stands further east than the second, on higher ground.
      expect(first[0]).toBeGreaterThan(second[0] ?? Number.NaN)
    })

    it('gives every vertex the edge’s width in ems of its own name, the same on the map for all', () => {
      const halo = nameGeometry({ ...input([name('A')]), haloCells: 0.2 }).getAttribute('haloEm')
      // A width of a fifth of a cell, on a name of size 2: a tenth of an em.
      expect(halo.getX(0)).toBeCloseTo(0.1, 6)
    })

    it('narrows the edge of a small name to what its tile holds, so it never fills the tile', () => {
      // A width of one cell, on a name of size 2, would be half an em — past the tile's pad.
      const halo = nameGeometry(input([name('A')])).getAttribute('haloEm')
      expect(halo.getX(0)).toBeCloseTo(HALO_MAX_EM, 6)
      expect(HALO_MAX_EM).toBeLessThan(SHEET_PAD)
    })

    it('turns a tile with its line', () => {
      const position = nameGeometry(input([name('A', Math.PI / 2)])).getAttribute('position')
      const zs = Array.from({ length: position.count }, (_, at) => position.getZ(at))
      const half = (CELL.advance / 2 + SHEET_PAD) * 2
      expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(2 * half, 5)
    })

    it('cuts the tile from its cell, the sheet’s top at the texture’s top', () => {
      const uv = nameGeometry(input([name('A')])).getAttribute('uv')
      // The first vertex is the tile's foot, at its left: the cell's bottom-left.
      expect([uv.getX(0), uv.getY(0)]).toEqual([0, 0])
      expect([uv.getX(VERTICES - 1), uv.getY(VERTICES - 1)]).toEqual([1, 1])
    })
  })

  describe('managed errors', () => {
    it('refuses a letter the sheet has no cell for', () => {
      expect(() => nameGeometry(input([name('B')]))).toThrow(/"B" of "B" has no cell/)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a name with fewer places than letters', () => {
      const short = { ...name('A'), text: 'AA' }
      expect(() => nameGeometry(input([short]))).toThrow(/no place for its letter 1/)
    })
  })

  describe('edge cases', () => {
    it('lays no tile for a space', () => {
      expect(nameGeometry(input([name('A A')])).getAttribute('position').count).toBe(2 * VERTICES)
    })

    it('builds an empty geometry for a level with no name', () => {
      expect(nameGeometry(input([])).getAttribute('position').count).toBe(0)
    })
  })
})
