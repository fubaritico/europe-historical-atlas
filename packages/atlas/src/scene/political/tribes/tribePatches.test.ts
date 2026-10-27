import { describe, expect, it } from 'vitest'

import { signedDistanceField } from '@europe-historical-atlas/core/geo/signedDistance'

import { tribePatches } from './tribePatches'

import type { TribeGround, TribePatch } from './tribePatches'
import type { TribeArea } from '../../../sources/mapSources'

const BOUNDS = { west: 0, south: 50, east: 10, north: 60 }
const GRID = { segX: 64, segY: 64 }

const SQUARE = [
  { u: 0.4, v: 0.4 },
  { u: 0.6, v: 0.4 },
  { u: 0.6, v: 0.6 },
  { u: 0.4, v: 0.6 },
]

const TRIBE: TribeArea = { polity: 'prussians', colour: '#41580b', rings: [SQUARE] }

/** A kingdom east of the tribe, sharing its eastern edge. */
const KINGDOM = [
  { u: 0.6, v: 0.4 },
  { u: 0.8, v: 0.4 },
  { u: 0.8, v: 0.6 },
  { u: 0.6, v: 0.6 },
]

/** Land everywhere west of u = 0.9, sea beyond. */
const LAND = { isLand: (u: number): boolean => u < 0.9 }

/**
 * The ground a patch is measured against, overridable.
 * @param over - what to change
 * @returns the ground
 */
const ground = (over: Partial<TribeGround> = {}): TribeGround => ({
  claims: [
    { polityId: 'prussians', rings: [SQUARE] },
    { polityId: 'poland', rings: [KINGDOM] },
  ],
  land: LAND,
  bounds: BOUNDS,
  grid: GRID,
  reachKm: 60,
  ...over,
})

/**
 * Each vertex of a patch, with what it carries.
 * @param patch - the patch
 * @returns its vertices
 */
function vertices(
  patch: TribePatch | undefined
): { u: number; v: number; d: number; c: number; land: number }[] {
  if (!patch) return []
  return [...patch.distances].map((d, k) => ({
    u: patch.triangles[2 * k] ?? 0,
    v: patch.triangles[2 * k + 1] ?? 0,
    d,
    c: patch.claimed[k] ?? 0,
    land: patch.land[k] ?? 0,
  }))
}

/**
 * The box a patch covers, read off its triangles.
 * @param triangles - flat `u, v`
 * @returns the extreme coordinates
 */
function extent(triangles: Float32Array): { u0: number; u1: number; v0: number; v1: number } {
  let [u0, u1, v0, v1] = [1, 0, 1, 0]
  for (let k = 0; k + 1 < triangles.length; k += 2) {
    const u = triangles[k] ?? 0
    const v = triangles[k + 1] ?? 0
    u0 = Math.min(u0, u)
    u1 = Math.max(u1, u)
    v0 = Math.min(v0, v)
    v1 = Math.max(v1, v)
  }
  return { u0, u1, v0, v1 }
}

describe('tribePatches', () => {
  describe('happy path', () => {
    it('hands back one patch per tribe, in its colour, one distance per vertex', () => {
      const [patch, ...rest] = tribePatches([TRIBE], ground())
      expect(rest).toEqual([])
      expect(patch?.tint).toEqual({ r: 0x41, g: 0x58, b: 0x0b })
      expect(patch?.distances.length).toBe((patch?.triangles.length ?? 0) / 2)
    })

    it('carries at each vertex the signed distance to the tribe’s outline', () => {
      const [patch] = tribePatches([TRIBE], ground())
      const distance = signedDistanceField([SQUARE], BOUNDS, 60)
      const triangles = patch?.triangles ?? new Float32Array(0)
      for (let k = 0; k < 50; k++) {
        const u = triangles[2 * k] ?? 0
        const v = triangles[2 * k + 1] ?? 0
        expect(patch?.distances[k]).toBeCloseTo(distance(u, v), 3)
      }
    })
  })

  describe('variants', () => {
    it('extends the patch past the outline by the reach, so an outset fade has room', () => {
      const [patch] = tribePatches([TRIBE], ground())
      const box = extent(patch?.triangles ?? new Float32Array(0))
      // 60 km at the box's northern edge (~57°N) is ~1° of longitude, ~0.1 of this 10° grid.
      expect(box.u0).toBeLessThan(0.4 - 0.09)
      expect(box.u1).toBeGreaterThan(0.6 + 0.09)
    })

    it('has vertices both inside and outside the outline', () => {
      const [patch] = tribePatches([TRIBE], ground())
      const distances = [...(patch?.distances ?? [])]
      expect(distances.some((d) => d < 0)).toBe(true)
      expect(distances.some((d) => d > 0)).toBe(true)
    })

    it('hands back one patch for each of two tribes', () => {
      const other = {
        polity: 'cumans',
        colour: '#123456',
        rings: [SQUARE.map(({ u, v }) => ({ u: u - 0.3, v }))],
      }
      expect(tribePatches([TRIBE, other], ground())).toHaveLength(2)
    })
  })

  describe('the cut of an outset spill', () => {
    it('reads every vertex inside the kingdom as claimed by another polity', () => {
      const inKingdom = vertices(tribePatches([TRIBE], ground())[0]).filter(
        ({ u, v }) => u > 0.61 && u < 0.79 && v > 0.41 && v < 0.59
      )
      expect(inKingdom.length).toBeGreaterThan(0)
      for (const { c } of inKingdom) expect(c).toBeLessThan(0)
    })

    it('does not read the tribe’s own ground as claimed by another', () => {
      const own = vertices(tribePatches([TRIBE], ground())[0]).filter(
        ({ u, v }) => u > 0.41 && u < 0.59 && v > 0.41 && v < 0.59
      )
      for (const { c } of own) expect(c).toBeGreaterThan(0)
    })

    it('carries the land under each vertex', () => {
      const all = vertices(tribePatches([TRIBE], ground())[0])
      expect(all.filter(({ u }) => u > 0.9).every(({ land }) => land === 0)).toBe(true)
      expect(all.filter(({ u }) => u < 0.9).every(({ land }) => land === 1)).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('hands back no patch for a tribe with no ring point — it has no ground', () => {
      expect(
        tribePatches([{ polity: 'prussians', colour: '#41580b', rings: [] }], ground())
      ).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a reach of zero, as the distance does', () => {
      expect(() => tribePatches([TRIBE], ground({ reachKm: 0 }))).toThrow(/reach/)
    })
  })

  describe('edge cases', () => {
    it('holds a tribe at the map’s edge within the grid', () => {
      const edge = {
        polity: 'prussians',
        colour: '#41580b',
        rings: [SQUARE.map(({ u, v }) => ({ u: u - 0.4, v }))],
      }
      const [patch] = tribePatches([edge], ground())
      expect(extent(patch?.triangles ?? new Float32Array(0)).u0).toBe(0)
    })

    it('hands back nothing for no tribe', () => {
      expect(tribePatches([], ground())).toEqual([])
    })
  })
})
