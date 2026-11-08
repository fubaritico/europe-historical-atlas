import { describe, expect, it } from 'vitest'

import { LEADER_DOT } from '@europe-historical-atlas/core/pipeline/nameOffset'

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

/** Vertices per tile: its four corners, the ground under it sampled finer (ATLAS-333). */
const VERTICES = 4

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
    sheet: {
      cells: new Map([
        ['A', CELL],
        [LEADER_DOT, CELL],
      ]),
      ascent: 0.75,
      descent: 0.25,
    },
    grid: { width: 21, height: 21 },
    draped: (u, v) => [u * 20, 0, v * 20],
    haloCells: 1,
  }
}

describe('tileSteps', () => {
  it('samples the ground under a large letter finer than under a small one, about once per cell of the relief', () => {
    expect(tileSteps(4)).toBeLessThan(tileSteps(20))
    expect(tileSteps(20)).toBe(30)
  })

  it('keeps a small letter at the fewest steps, and the largest at the most', () => {
    expect([tileSteps(0.5), tileSteps(1000)]).toEqual([MIN_TILE_STEPS, MAX_TILE_STEPS])
  })
})

describe('nameGeometry', () => {
  describe('happy path', () => {
    it('lays one tile per letter, its four corners and two triangles', () => {
      const geometry = nameGeometry(input([name('AA')]))
      expect(geometry.getAttribute('position').count).toBe(2 * VERTICES)
      expect(geometry.getIndex()?.count).toBe(2 * 6)
    })

    // Review QUAL-002: each tile's two triangles cover its own four corners — the second tile's offset included.
    it('ties each tile’s two triangles to its own corners: foot-left, foot-right, top-left, top-right', () => {
      const index = nameGeometry(input([name('AA')])).getIndex()
      expect(Array.from(index?.array ?? [])).toEqual([0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6])
    })

    it('cuts each corner from its own corner of the cell', () => {
      const uv = nameGeometry(input([name('A')])).getAttribute('uv')
      const corners = Array.from({ length: 4 }, (_, at) => [uv.getX(at), uv.getY(at)])
      // Foot-left, foot-right, top-left, top-right; the sheet flipped on upload, its top at the texture's top.
      expect(corners).toEqual([
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ])
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

    // ATLAS-333: four corners, but the median of the ground sampled finely under the letter, as the grid gave it.
    it('lays a name at the median of the ground sampled finely under it, not of its four corners', () => {
      // A letter of size 4, sampled on a grid of 6 steps a side: 49 samples, 25 inside the tile, on a plateau of 10;
      // its edge, its four corners with it, on ground at 0.
      const half = (CELL.advance / 2 + SHEET_PAD) * 4
      const big = { ...name('A'), size: 4 }
      const position = nameGeometry({
        ...input([big]),
        draped: (u, v) => {
          const [x, z] = [u * 20, v * 20]
          const inside = Math.abs(x - 10) < half - 0.01 && z > 10 - 3 + 0.01 && z < 10 + 1 - 0.01
          return [x, inside ? 10 : 0, z]
        },
      }).getAttribute('position')
      expect(tileSteps(4)).toBe(6)
      expect(position.getY(0)).toBe(10)
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

  // ATLAS-315: a name written over a neighbour's land, tied to its country by dots.
  describe('the leader', () => {
    it('lays one tile per dot of the leader, after the name’s letters', () => {
      const tied = { ...name('A'), leader: [0, 1, 2].map((at) => ({ x: 4 + at, y: 4, angle: 0 })) }
      expect(nameGeometry(input([tied])).getAttribute('position').count).toBe(4 * VERTICES)
    })

    it('refuses a leader when the sheet has no dot', () => {
      const tied = { ...name('A'), leader: [{ x: 4, y: 4, angle: 0 }] }
      const noDot = {
        ...input([tied]),
        sheet: { ...input([]).sheet, cells: new Map([['A', CELL]]) },
      }
      expect(() => nameGeometry(noDot)).toThrow(/leader's dot has no cell/)
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
