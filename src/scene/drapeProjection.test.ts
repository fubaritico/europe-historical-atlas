import { describe, expect, it, vi } from 'vitest'

import { createDrapeProjection, meshSurfaceY } from './drapeProjection'
import { WORLD_PER_METRE } from './reliefMesh'

import type { DrapeProjectionDeps, DrapeSource, HeightCurve } from './drapeProjection'

const CURVE: HeightCurve = { plainsCeiling: 600, peakTarget: 2000 }

/** A grid returning the same elevation everywhere. */
const flat = (elevation: number, width = 8, height = 8): DrapeSource => ({
  meta: { width, height },
  sample: () => elevation,
})

/** A grid with a vertical cliff at u = 0.5 — nothing a linear ramp could mimic. */
const cliff = (high: number, width = 8, height = 8): DrapeSource => ({
  meta: { width, height },
  sample: (u: number) => (u < 0.5 ? 0 : high),
})

const deps = (over: Partial<DrapeProjectionDeps> = {}): DrapeProjectionDeps => ({
  worldWidth: 12,
  segments: 4,
  frame: () => ({ width: 8, height: 8 }),
  source: () => flat(0),
  curve: () => CURVE,
  flatLift: () => 0.01,
  drapedLift: 0.004,
  ...over,
})

describe('drapeProjection', () => {
  describe('happy path', () => {
    it('places the grid centre at the world origin', () => {
      const [x, , z] = createDrapeProjection(deps()).toWorld(0.5, 0.5)
      expect(x).toBeCloseTo(0)
      expect(z).toBeCloseTo(0)
    })

    it('lifts a flat projection to the configured height above the sea', () => {
      expect(createDrapeProjection(deps()).toWorld(0.5, 0.5)[1]).toBeCloseTo(0.01)
    })

    it('passes plains elevations through 1:1 into world units', () => {
      // 300 m is below `plainsCeiling`, so the curve is the identity and only the world scale applies.
      expect(meshSurfaceY(0.5, 0.5, flat(300), 4, CURVE)).toBeCloseTo(300 * WORLD_PER_METRE)
    })

    it('drapes a point on the surface plus the clearance lift', () => {
      const [, y] = createDrapeProjection(deps({ source: () => flat(300) })).draped(0.5, 0.5)
      expect(y).toBeCloseTo(300 * WORLD_PER_METRE + 0.004)
    })
  })

  describe('variants', () => {
    it('spans the full world width from west edge to east edge', () => {
      const projection = createDrapeProjection(deps())
      expect(projection.toWorld(0, 0.5)[0]).toBeCloseTo(-6)
      expect(projection.toWorld(1, 0.5)[0]).toBeCloseTo(6)
    })

    it('derives the depth from the frame aspect, north at -Z', () => {
      // A frame twice as wide as it is tall halves the world depth.
      const projection = createDrapeProjection(deps({ frame: () => ({ width: 16, height: 8 }) }))
      expect(projection.toWorld(0.5, 0)[2]).toBeCloseTo(-3)
      expect(projection.toWorld(0.5, 1)[2]).toBeCloseTo(3)
    })

    it('takes the XZ mapping from the frame and the height from the source', () => {
      // The two are separate grids in the app — the raw DEM sizes the plane, the smoothed one is
      // sampled for height — so a projection must not silently read one for the other.
      const projection = createDrapeProjection(
        deps({ frame: () => ({ width: 16, height: 8 }), source: () => flat(300) })
      )
      const [x, y, z] = projection.draped(1, 1)
      expect(x).toBeCloseTo(6)
      expect(z).toBeCloseTo(3)
      expect(y).toBeCloseTo(300 * WORLD_PER_METRE + 0.004)
    })

    it('eases elevations above the plains ceiling instead of passing them through', () => {
      const eased = meshSurfaceY(0.5, 0.5, flat(5000), 4, CURVE)
      expect(eased).toBeLessThan(5000 * WORLD_PER_METRE)
      expect(eased).toBeGreaterThan(CURVE.plainsCeiling * WORLD_PER_METRE)
      expect(eased).toBeLessThan(CURVE.peakTarget * WORLD_PER_METRE)
    })

    it('flattens the sea rather than sinking below it', () => {
      expect(meshSurfaceY(0.5, 0.5, flat(-400), 4, CURVE)).toBe(0)
    })

    it('follows the mesh vertex grid, not the elevation grid', () => {
      // At u = 0.25 the DEM reads 0 (the cliff is at 0.5), but the mesh spans that gap with a triangle
      // running from the node at u = 0 to the node at u = 0.5. A point placed at the DEM value would sit
      // below the drawn surface and be occluded — which is the whole reason this function exists.
      const surface = meshSurfaceY(0.25, 0.5, cliff(500), 2, CURVE)
      expect(surface).toBeCloseTo(0.5 * 500 * WORLD_PER_METRE)
      expect(surface).toBeGreaterThan(0)
    })

    it('lands exactly on a vertex where one exists', () => {
      // u = 0.5 with 2 segments is node 1, so no interpolation happens and the DEM value comes through.
      expect(meshSurfaceY(0.5, 0.5, cliff(500), 2, CURVE)).toBeCloseTo(500 * WORLD_PER_METRE)
    })

    it('reads the lift, the curve and the source on every call, not once at build time', () => {
      // Each of these is dragged live in the dev panel; a projection built from a snapshot would quietly
      // stop matching the terrain the moment one moved.
      let lift = 0.01
      let curve: HeightCurve = CURVE
      const projection = createDrapeProjection(
        deps({
          flatLift: () => lift,
          curve: () => curve,
          source: () => flat(5000),
        })
      )
      const before = projection.draped(0.5, 0.5)
      lift = 0.5
      curve = { plainsCeiling: 4000, peakTarget: 9000 }
      const after = projection.draped(0.5, 0.5)
      expect(projection.toWorld(0.5, 0.5)[1]).toBeCloseTo(0.5)
      expect(after[1]).toBeGreaterThan(before[1])
    })
  })

  describe('managed errors', () => {
    it('collapses to the origin while the elevation has not loaded', () => {
      const [x, y, z] = createDrapeProjection(deps({ frame: () => null })).toWorld(0.9, 0.1)
      expect([x, z]).toEqual([0, 0])
      expect(y).toBeCloseTo(0.01)
    })

    it('drapes at sea level while the sampled grid has not been derived', () => {
      // The XZ mapping still holds — only the height is unknown — so an overlay built in this window
      // lands in the right place, flat, rather than piling up at the origin.
      const [x, y, z] = createDrapeProjection(deps({ source: () => null })).draped(1, 1)
      expect(x).toBeCloseTo(6)
      expect(z).toBeCloseTo(6)
      expect(y).toBe(0)
    })

    it('does not apply the clearance lift when there is no surface to clear', () => {
      expect(createDrapeProjection(deps({ source: () => null })).draped(0.5, 0.5)[1]).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    it('lets a failing grid surface its error instead of swallowing it', () => {
      const broken: DrapeSource = {
        meta: { width: 8, height: 8 },
        sample: vi.fn(() => {
          throw new Error('grid detached')
        }),
      }
      expect(() => createDrapeProjection(deps({ source: () => broken })).draped(0.5, 0.5)).toThrow(
        'grid detached'
      )
    })

    it('reads a non-finite elevation as sea level, silently', () => {
      // Recorded rather than desired. `reliefWorldY` decides with `> plainsCeiling` then `> 0`, and NaN
      // fails both, so it falls into the sea branch — a corrupt grid comes out as flat ocean with no
      // error anywhere. Left as is: this refactor is behaviour-preserving, and that curve also feeds the
      // relief mesh itself. Only reachable through a Float32 grid; the shipped DEM is Int16.
      const nan: DrapeSource = { meta: { width: 8, height: 8 }, sample: () => Number.NaN }
      expect(meshSurfaceY(0.5, 0.5, nan, 4, CURVE)).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('clamps coordinates outside the grid instead of reading past its edge', () => {
      const sample = vi.fn(() => 100)
      const source: DrapeSource = { meta: { width: 8, height: 8 }, sample }
      expect(meshSurfaceY(-3, 4, source, 4, CURVE)).toBeCloseTo(100 * WORLD_PER_METRE)
      for (const call of sample.mock.calls as unknown as [number, number][]) {
        expect(call[0]).toBeGreaterThanOrEqual(0)
        expect(call[0]).toBeLessThanOrEqual(1)
        expect(call[1]).toBeGreaterThanOrEqual(0)
        expect(call[1]).toBeLessThanOrEqual(1)
      }
    })

    it('holds up on a single-segment mesh', () => {
      expect(meshSurfaceY(0.5, 0.5, flat(300), 1, CURVE)).toBeCloseTo(300 * WORLD_PER_METRE)
    })

    it('holds up on a 1×1 grid', () => {
      expect(meshSurfaceY(0.5, 0.5, flat(300, 1, 1), 4, CURVE)).toBeCloseTo(300 * WORLD_PER_METRE)
    })

    it('keeps at least one row of mesh nodes on an extremely wide frame', () => {
      // `segments / aspect` rounds to zero for a very wide grid; a zero-row mesh has no surface at all.
      expect(meshSurfaceY(0.5, 0.5, flat(300, 4000, 1), 4, CURVE)).toBeCloseTo(
        300 * WORLD_PER_METRE
      )
    })

    it('places the far corner of the grid at the far corner of the plane', () => {
      const [x, , z] = createDrapeProjection(deps()).toWorld(1, 1)
      expect(x).toBeCloseTo(6)
      expect(z).toBeCloseTo(6)
    })
  })
})
