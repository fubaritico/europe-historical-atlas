import { describe, expect, it } from 'vitest'

import { extractRegionBorders } from './regionBorders'
import {
  assignRegionColors,
  createRegionRaster,
  expandRegionsOverLand,
  rasteriseRegions,
  regionColor,
} from './regionRaster'

import type { RegionBorderSegment } from './regionBorders'
import type { RegionRaster } from './regionRaster'
import type { Region } from './regionSource'
import type { RgbColor } from '../utils/color'

/**
 * Build a raster straight from cell indices, bypassing the scanline fill — the border derivation only
 * ever reads `cells`, so stating the grid literally keeps each expectation readable.
 * @param rows - one row of region indices per line, `-1` for unclaimed
 * @returns the raster
 */
function grid(rows: number[][]): RegionRaster {
  // Built through the real factory rather than a hand-rolled copy of the lookup, so a fixture cannot
  // drift from the implementation it is meant to exercise.
  return createRegionRaster(rows[0]?.length ?? 0, rows.length, Int16Array.from(rows.flat()))
}

/** A polity covering a rectangle of the unit square. */
function box(u0: number, v0: number, u1: number, v1: number): Region {
  return {
    name: null,
    subjectTo: null,
    partOf: null,
    rings: [
      [
        { u: u0, v: v0 },
        { u: u1, v: v0 },
        { u: u1, v: v1 },
        { u: u0, v: v1 },
      ],
    ],
  }
}

/** Explode chains into point pairs, the shape most of these assertions are written against. */
function toSegments(
  lines: readonly (readonly { u: number; v: number }[])[]
): RegionBorderSegment[] {
  const segments: RegionBorderSegment[] = []
  for (const line of lines)
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i]
      const b = line[i + 1]
      if (a && b) segments.push([a, b])
    }
  return segments
}

/** The shared-border stretches alone — the kind most of these tests are about. */
function between(raster: RegionRaster, smoothing?: number): RegionBorderSegment[] {
  const derived = extractRegionBorders(raster, smoothing === undefined ? {} : { smoothing })
  return toSegments(derived.between.flatMap((group) => group.lines))
}

/** Total length of a border, in normalized units — a shape-independent way to compare smoothings. */
function totalLength(segments: readonly RegionBorderSegment[]): number {
  return segments.reduce((sum, [a, b]) => sum + Math.hypot(b.u - a.u, b.v - a.v), 0)
}

const PALETTE: RgbColor[] = [
  { r: 1, g: 0, b: 0 },
  { r: 0, g: 1, b: 0 },
  { r: 0, g: 0, b: 1 },
]

describe('regionRaster', () => {
  describe('happy path', () => {
    it('rasterises a polity into the cells its ring covers', () => {
      const raster = rasteriseRegions([box(0, 0, 1, 0.5)], 4, 4)
      expect(raster.indexAt(0.5, 0)).toBe(0)
      expect(raster.indexAt(0.5, 1)).toBe(-1)
    })

    it('derives a border between two polities that touch', () => {
      const segments = between(
        grid([
          [0, 1],
          [0, 1],
        ])
      )
      expect(segments.length).toBeGreaterThan(0)
      // The only shared edges are vertical, on the column boundary at u = 0.5.
      for (const [a, b] of segments) {
        expect(a.u).toBeCloseTo(0.5)
        expect(b.u).toBeCloseTo(0.5)
      }
    })

    it('gives adjacent polities different colours', () => {
      const raster = grid([
        [0, 1],
        [0, 1],
      ])
      const colors = assignRegionColors(raster, [{ name: 'a' }, { name: 'b' }], PALETTE)
      expect(colors[0]).not.toEqual(colors[1])
    })

    it('keeps a polity’s colour stable across centuries by keying on its name', () => {
      expect(regionColor('France')).toEqual(regionColor('France'))
      expect(regionColor('France')).not.toEqual(regionColor('Aragon'))
    })
  })

  describe('variants', () => {
    it('emits horizontal edges when the polities are stacked', () => {
      const segments = between(
        grid([
          [0, 0],
          [1, 1],
        ])
      )
      expect(segments.length).toBeGreaterThan(0)
      for (const [a, b] of segments) {
        expect(a.v).toBeCloseTo(0.5)
        expect(b.v).toBeCloseTo(0.5)
      }
    })

    it('shortens the border as smoothing rounds its corners', () => {
      // An L-shaped frontier: the staircase is longer than the curve that replaces it.
      const raster = grid([
        [0, 0, 1],
        [0, 1, 1],
        [1, 1, 1],
      ])
      const raw = totalLength(between(raster, 0))
      const once = totalLength(between(raster, 1))
      const twice = totalLength(between(raster, 2))
      expect(once).toBeLessThan(raw)
      expect(twice).toBeLessThan(once)
    })

    it('leaves the raw cell edges alone when smoothing is zero', () => {
      const raster = grid([
        [0, 1],
        [0, 1],
      ])
      // Two cell edges stacked, chained into one polyline of length 1 in v.
      expect(totalLength(between(raster, 0))).toBeCloseTo(1)
    })

    it('grows a claim over land the outline missed, but no further than allowed', () => {
      const raster = expandRegionsOverLand(grid([[0, -1, -1]]), () => true, 1)
      expect(raster.cells[1]).toBe(0)
      expect(raster.cells[2]).toBe(-1)
    })

    it('never grows a claim into water', () => {
      const raster = expandRegionsOverLand(grid([[0, -1]]), () => false, 5)
      expect(raster.cells[1]).toBe(-1)
    })

    it('traces a frontier where a polity meets land nobody claims', () => {
      // What lets a map stop declaring nations before it runs out of paper.
      const borders = extractRegionBorders(
        grid([
          [0, -1],
          [0, -1],
        ]),
        { isLand: () => true }
      )
      expect(borders.between).toEqual([])
      expect(borders.frontier.length).toBeGreaterThan(0)
      for (const [a, b] of toSegments(borders.frontier)) {
        expect(a.u).toBeCloseTo(0.5)
        expect(b.u).toBeCloseTo(0.5)
      }
    })

    it('keeps the frontier out of the shared borders', () => {
      // Two polities and a void: the negotiated border and the edge of the map are different objects and
      // must stay separable, or they cannot be drawn in different hands.
      const borders = extractRegionBorders(
        grid([
          [0, 1],
          [-1, -1],
        ]),
        { isLand: () => true }
      )
      expect(borders.between.length).toBeGreaterThan(0)
      expect(borders.frontier.length).toBeGreaterThan(0)
      expect(toSegments(borders.between.flatMap((group) => group.lines))).not.toEqual(
        toSegments(borders.frontier)
      )
    })

    it('pins an editorial colour ahead of the palette', () => {
      const pinned: RgbColor = { r: 9, g: 9, b: 9 }
      const colors = assignRegionColors(
        grid([[0, 1]]),
        [{ name: 'a' }, { name: 'b' }],
        PALETTE,
        (name) => (name === 'a' ? pinned : null)
      )
      expect(colors[0]).toEqual(pinned)
    })
  })

  describe('managed errors', () => {
    it('draws no shared border where a polity faces unclaimed ground', () => {
      // One claimant is not a border between two states, whatever lies on the far side.
      expect(
        between(
          grid([
            [0, -1],
            [0, -1],
          ])
        )
      ).toEqual([])
    })

    it('traces no frontier at all without a land test', () => {
      // A raster of claims cannot tell unclaimed land from open sea, so it must not guess: drawing over
      // the sea would double the shoreline the map already renders from a better source.
      const borders = extractRegionBorders(
        grid([
          [0, -1],
          [0, -1],
        ])
      )
      expect(borders.frontier).toEqual([])
    })

    it('stays silent where a polity meets open sea', () => {
      const borders = extractRegionBorders(
        grid([
          [0, -1],
          [0, -1],
        ]),
        { isLand: () => false }
      )
      expect(borders.frontier).toEqual([])
      expect(borders.between).toEqual([])
    })

    it('draws no border inside a single polity', () => {
      expect(
        between(
          grid([
            [0, 0],
            [0, 0],
          ])
        )
      ).toEqual([])
    })

    it('falls back to a neutral tint when the palette is empty', () => {
      const colors = assignRegionColors(grid([[0]]), [{ name: 'a' }], [])
      expect(colors).toHaveLength(1)
      expect(colors[0]).toBeDefined()
    })
  })

  describe('unmanaged errors', () => {
    it('survives a ring whose vertices are all identical', () => {
      const degenerate: Region = {
        name: null,
        subjectTo: null,
        partOf: null,
        rings: [
          [
            { u: 0.5, v: 0.5 },
            { u: 0.5, v: 0.5 },
            { u: 0.5, v: 0.5 },
          ],
        ],
      }
      expect(() => rasteriseRegions([degenerate], 4, 4)).not.toThrow()
    })

    it('tolerates indices beyond the region list when colouring', () => {
      // A raster and a region list can only disagree through a caller bug; it must not throw.
      expect(() => assignRegionColors(grid([[7]]), [{ name: 'a' }], PALETTE)).not.toThrow()
    })

    it('keys a nameless polity without throwing', () => {
      expect(() => regionColor(null)).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('returns no border for a grid too small to have an interior edge', () => {
      expect(between(grid([[0]]))).toEqual([])
    })

    it('closes the loop around an enclave', () => {
      // Polity 1 fully surrounded by polity 0: the border must come back on itself, so every endpoint
      // is shared by exactly two segments — the property that proves there is no gap.
      const segments = between(
        grid([
          [0, 0, 0],
          [0, 1, 0],
          [0, 0, 0],
        ])
      )
      const degree = new Map<string, number>()
      for (const [a, b] of segments)
        for (const point of [a, b]) {
          const key = `${point.u.toFixed(6)},${point.v.toFixed(6)}`
          degree.set(key, (degree.get(key) ?? 0) + 1)
        }
      expect(segments.length).toBeGreaterThan(0)
      expect([...degree.values()].every((count) => count === 2)).toBe(true)
    })

    it('breaks the line at a tripoint rather than guessing a continuation', () => {
      // Three polities meeting at one corner: the shared point carries three stretches, so it cannot be
      // walked through — each branch has to end there.
      const segments = between(
        grid([
          [0, 1],
          [2, 2],
        ])
      )
      const degree = new Map<string, number>()
      for (const [a, b] of segments)
        for (const point of [a, b]) {
          const key = `${point.u.toFixed(6)},${point.v.toFixed(6)}`
          degree.set(key, (degree.get(key) ?? 0) + 1)
        }
      expect([...degree.values()].some((count) => count >= 3)).toBe(true)
    })

    it('covers every shared edge exactly once', () => {
      // Gaplessness, stated as a measurement: the enclave's frontier is a square of side one cell —
      // 0.5 on a 3-wide grid — so its perimeter is exactly 2, with nothing counted twice or dropped.
      const raster = grid([
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ])
      expect(totalLength(between(raster, 0))).toBeCloseTo(2)
    })

    it('clips a border that would run past the frame edge', () => {
      // On a 2×2 grid every cell touches the frame, so each of the four shared edges is halved rather
      // than drawn outside the map — 4 × 0.5 instead of 4 × 1.
      const raster = grid([
        [0, 1],
        [1, 0],
      ])
      expect(totalLength(between(raster, 0))).toBeCloseTo(2)
    })

    it('leaves a two-point stretch untouched by smoothing', () => {
      const raster = grid([
        [0, 1],
        [-1, -1],
      ])
      expect(between(raster, 0)).toEqual(between(raster, 3))
    })

    it('keeps every point inside the frame after smoothing', () => {
      const segments = between(
        grid([
          [0, 1],
          [1, 0],
        ]),
        3
      )
      for (const [a, b] of segments)
        for (const point of [a, b]) {
          expect(point.u).toBeGreaterThanOrEqual(0)
          expect(point.u).toBeLessThanOrEqual(1)
          expect(point.v).toBeGreaterThanOrEqual(0)
          expect(point.v).toBeLessThanOrEqual(1)
        }
    })

    it('caps the smoothing count instead of allocating exponentially', () => {
      // Each round roughly doubles the point count, so an unclamped caller could allocate without
      // bound. The port has to be safe on its own — the dev panel's slider is not its guard.
      const raster = grid([
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ])
      expect(between(raster, 1000)).toEqual(between(raster, 4))
    })

    it('ignores a negative smoothing count instead of looping', () => {
      const raster = grid([
        [0, 1],
        [0, 1],
      ])
      expect(between(raster, -2)).toEqual(between(raster, 0))
    })

    it('rasterises nothing into a grid with no interior', () => {
      expect(rasteriseRegions([box(0, 0, 1, 1)], 1, 1).cells).toEqual(Int16Array.from([-1]))
    })
  })
})
