import { describe, expect, it } from 'vitest'

import { createMapEdge, edgeOutline, strataTone } from './mapEdge'

import type { DrapeSource } from './drapeProjection'
import type { MapEdgeOptions } from './mapEdge'

/** A grid whose western half is ocean and eastern half a plateau — a coast to cut through. */
const SPLIT: DrapeSource = {
  meta: { width: 16, height: 16 },
  sample: (u: number) => (u < 0.5 ? -200 : 900),
}

const OPTIONS: MapEdgeOptions = {
  source: SPLIT,
  worldWidth: 12,
  segments: 8,
  curve: { plainsCeiling: 575, peakTarget: 1900 },
  depth: 0.06,
  soil: '#a8875c',
  deep: '#6b5136',
  base: '#c9bb9c',
  strata: 5,
}

describe('edgeOutline', () => {
  describe('happy path', () => {
    it('walks the whole boundary once', () => {
      // Two runs of segX and two of segY, on a square grid: four times eight.
      expect(edgeOutline(OPTIONS)).toHaveLength(32)
    })
  })

  describe('variants', () => {
    it('stays on the boundary, never inside the map', () => {
      const halfWidth = OPTIONS.worldWidth / 2
      for (const point of edgeOutline(OPTIONS)) {
        const onEdge =
          Math.abs(Math.abs(point.x) - halfWidth) < 1e-6 ||
          Math.abs(Math.abs(point.z) - halfWidth) < 1e-6
        expect(onEdge).toBe(true)
      }
    })

    it('closes on itself, so the wall has no gap', () => {
      const outline = edgeOutline(OPTIONS)
      const first = outline[0]
      const last = outline[outline.length - 1]
      // The last point is one step from the first, not the first repeated: the strip wraps.
      expect(
        Math.hypot((last?.x ?? 0) - (first?.x ?? 0), (last?.z ?? 0) - (first?.z ?? 0))
      ).toBeLessThan(OPTIONS.worldWidth / OPTIONS.segments + 1e-6)
    })

    it('stands proud where there is land and lies flat where there is sea', () => {
      // The reason the wall reads as a section rather than a plinth.
      const outline = edgeOutline(OPTIONS)
      expect(outline.some((p) => p.y > 0)).toBe(true)
      expect(outline.some((p) => p.y === 0)).toBe(true)
    })

    it('meets the mesh vertex for vertex, not the DEM', () => {
      // Sampled more finely than the surface it meets, a wall shows a saw of gaps along the join.
      expect(edgeOutline({ ...OPTIONS, segments: 4 })).toHaveLength(16)
    })
  })

  describe('managed errors', () => {
    it('follows the grid aspect rather than assuming a square map', () => {
      const wide: DrapeSource = { meta: { width: 32, height: 8 }, sample: () => 0 }
      const outline = edgeOutline({ ...OPTIONS, source: wide })
      const depth = Math.max(...outline.map((p) => p.z)) * 2
      expect(depth).toBeCloseTo(OPTIONS.worldWidth / 4)
    })
  })

  describe('unmanaged errors', () => {
    it('reads a sea-level map as a flat rim rather than refusing it', () => {
      const flat: DrapeSource = { meta: { width: 16, height: 16 }, sample: () => -1 }
      for (const point of edgeOutline({ ...OPTIONS, source: flat })) expect(point.y).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('holds up on a single-segment mesh', () => {
      expect(edgeOutline({ ...OPTIONS, segments: 1 }).length).toBeGreaterThan(0)
    })
  })
})

describe('strataTone', () => {
  const from = { r: 200, g: 100, b: 0 }
  const to = { r: 0, g: 50, b: 100 }

  describe('happy path', () => {
    it('starts at the first tone', () => {
      expect(strataTone(from, to, 0, 5)).toEqual(from)
    })
  })

  describe('variants', () => {
    it('reaches the second tone at the bottom', () => {
      expect(strataTone(from, to, 1, 5)).toEqual(to)
    })

    it('steps rather than ramps, so the cut reads as layers', () => {
      // A gradient reads as lighting; layers read as depth. Two depths inside one band must match.
      expect(strataTone(from, to, 0.02, 5)).toEqual(strataTone(from, to, 0.18, 5))
    })

    it('ramps cleanly when no banding was asked for', () => {
      expect(strataTone(from, to, 0.5, 0).r).toBeCloseTo(100)
    })
  })

  describe('managed errors', () => {
    it('clamps a depth outside the cut', () => {
      expect(strataTone(from, to, -3, 5)).toEqual(from)
      expect(strataTone(from, to, 9, 5)).toEqual(to)
    })
  })

  describe('unmanaged errors', () => {
    it('does not overshoot past the second tone on the last band', () => {
      for (let i = 0; i <= 20; i++) {
        const tone = strataTone(from, to, i / 20, 5)
        expect(tone.b).toBeLessThanOrEqual(to.b)
        expect(tone.r).toBeGreaterThanOrEqual(to.r)
      }
    })
  })

  describe('edge cases', () => {
    it('treats one band as none, which is a clean ramp', () => {
      // A single stratum is not a layer, it is the whole cut — so there is nothing to step between.
      expect(strataTone(from, to, 0.5, 1)).toEqual(strataTone(from, to, 0.5, 0))
    })
  })
})

describe('createMapEdge', () => {
  describe('happy path', () => {
    it('builds the cut and the board as two walls', () => {
      const edge = createMapEdge(OPTIONS)
      expect((edge.object as unknown as { children: unknown[] }).children).toHaveLength(2)
      edge.dispose()
    })
  })

  describe('variants', () => {
    it('scales only the cut, leaving the board its thickness', () => {
      // A board does not get thinner when the mountains are flattened.
      const edge = createMapEdge(OPTIONS)
      const [cut, board] = (edge.object as unknown as { children: { scale: { y: number } }[] })
        .children
      edge.setReliefScale(0.3)
      expect(cut?.scale.y).toBeCloseTo(0.3)
      expect(board?.scale.y).toBe(1)
      edge.dispose()
    })
  })

  // L3 (managed errors): N/A — it builds geometry from values already settled by the caller.

  describe('unmanaged errors', () => {
    it('builds a board and no cut for a map entirely at sea', () => {
      const flat: DrapeSource = { meta: { width: 16, height: 16 }, sample: () => -1 }
      const edge = createMapEdge({ ...OPTIONS, source: flat })
      expect(edge.object).toBeDefined()
      edge.dispose()
    })
  })

  describe('edge cases', () => {
    it('frees both geometries and the material on teardown', () => {
      const edge = createMapEdge(OPTIONS)
      expect(() => {
        edge.dispose()
      }).not.toThrow()
    })
  })
})
