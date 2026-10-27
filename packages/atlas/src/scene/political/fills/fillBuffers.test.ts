// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { planeHeight } from '@europe-historical-atlas/core/pipeline/gridDrape'

import { fillBuffers } from './fillBuffers'
import {
  DEPTH,
  GRID,
  LORD,
  VASSAL,
  WORLD_WIDTH,
  nodeY,
  options,
  raycastHeight,
  segX,
  segY,
  twoPolities,
} from './testing/fillFixtures'

describe('planeHeight', () => {
  describe('happy path', () => {
    it('is the height of the real relief mesh under the point, wherever it falls in a cell', () => {
      // The split is asserted against three's own PlaneGeometry, not against our reading of it: a ray
      // dropped onto the built relief must land where the fill puts its vertex (session review ARCH-003).
      for (const [u, v] of [
        [0.13, 0.27],
        [0.61, 0.08],
        [0.5, 0.5],
        [0.88, 0.71],
        [0.33, 0.94],
        [0.0625, 0.1875],
      ] as const)
        expect(planeHeight(u, v, GRID, nodeY)).toBeCloseTo(raycastHeight(u, v), 6)
    })
  })

  describe('variants', () => {
    it('agrees on both sides of a cell diagonal, where the two planes meet', () => {
      // Cell (2, 3): its diagonal runs from (2, 4) to (3, 3) in cells.
      const u = 2.3 / segX
      const v = 3.7 / segY
      expect(planeHeight(u, v, GRID, nodeY)).toBeCloseTo(raycastHeight(u, v), 6)
    })

    it('is the node height on a node', () => {
      expect(planeHeight(3 / segX, 5 / segY, GRID, nodeY)).toBeCloseTo(nodeY(3, 5), 9)
    })
  })

  // L3 (managed errors): N/A — it reads a grid of heights and returns one; nothing can be refused.

  describe('unmanaged errors', () => {
    it('carries a NaN height through rather than putting the fill at sea level', () => {
      expect(planeHeight(0.5, 0.5, GRID, () => Number.NaN)).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('clamps a point past the far edge onto the last row and column', () => {
      expect(planeHeight(1, 1, GRID, nodeY)).toBeCloseTo(nodeY(segX, segY), 9)
      expect(planeHeight(1.2, -0.1, GRID, nodeY)).toBeCloseTo(nodeY(segX, 0), 9)
    })
  })
})

describe('fillBuffers', () => {
  describe('happy path', () => {
    it('lays every vertex on the relief and paints it its polity tint', () => {
      const { positions, tints } = fillBuffers(options())
      expect(positions.length).toBeGreaterThan(0)
      for (let k = 0; k < positions.length; k += 3) {
        const u = (positions[k] ?? 0) / WORLD_WIDTH + 0.5
        const v = (positions[k + 2] ?? 0) / DEPTH + 0.5
        expect(positions[k + 1]).toBeCloseTo(raycastHeight(u, v), 5)
      }
      expect(tints).toHaveLength(1)
      expect(Array.from(tints[0]?.slice(0, 3) ?? [])).toEqual([200, 40, 10])
    })
  })

  describe('variants', () => {
    it('writes one tint buffer per level, the vassal in its lord’s colour at level 0', () => {
      const fills = twoPolities()
      const { positions, tints } = fillBuffers(
        options({
          fills,
          tintLevels: [
            [LORD, LORD],
            [LORD, VASSAL],
          ],
        })
      )
      const lordVertices = Math.floor((fills[0]?.length ?? 0) / 2)
      const last = positions.length - 3
      expect(tints).toHaveLength(2)
      expect(Array.from(tints[0]?.slice(last, last + 3) ?? [])).toEqual([10, 20, 30])
      expect(Array.from(tints[1]?.slice(last, last + 3) ?? [])).toEqual([200, 100, 50])
      expect(Array.from(tints[1]?.slice(0, 3) ?? [])).toEqual([10, 20, 30])
      expect(lordVertices).toBeGreaterThan(0)
    })
  })

  describe('managed errors', () => {
    it('leaves out a polity with no tint at the deepest level', () => {
      const { positions } = fillBuffers(options({ tintLevels: [[null]] }))
      expect(positions.length).toBe(0)
    })

    it('leaves a polity out of every level when its deepest tint is null', () => {
      const { positions, tints } = fillBuffers(
        options({
          fills: twoPolities(),
          tintLevels: [
            [LORD, null],
            [LORD, null],
          ],
        })
      )
      expect(tints[0]?.length).toBe(positions.length)
      expect(tints[1]?.length).toBe(positions.length)
    })
  })

  describe('unmanaged errors', () => {
    it('throws when no level is given', () => {
      expect(() => fillBuffers(options({ tintLevels: [] }))).toThrow(/no tint level/)
    })

    it('throws when a filled polity has no tint at a lower level', () => {
      expect(() =>
        fillBuffers(
          options({
            fills: twoPolities(),
            tintLevels: [
              [LORD, null],
              [LORD, VASSAL],
            ],
          })
        )
      ).toThrow(/polity 1 is filled but has no tint at level 0/)
    })
  })

  describe('edge cases', () => {
    it('writes nothing for no polity', () => {
      const { positions, tints } = fillBuffers(options({ fills: [], tintLevels: [[], []] }))
      expect(positions.length).toBe(0)
      expect(tints.map((bytes) => bytes.length)).toEqual([0, 0])
    })
  })
})
