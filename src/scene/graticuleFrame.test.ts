import { describe, expect, it } from 'vitest'

import {
  FRAME_RENDER_ORDER,
  buildFrameQuads,
  createGraticuleFrame,
  degreeIndices,
  graduations,
} from './graticuleFrame'
import { PAPER_SHEET_RENDER_ORDER } from './paperSheet'

import type { GraticuleFrameOptions } from './graticuleFrame'

/** The shipped frame: the Atlantic to Kazakhstan, the Sahara to the Arctic. */
const OPTIONS: GraticuleFrameOptions = {
  bounds: { west: -45, south: 11, east: 78.75, north: 76.84 },
  worldWidth: 12,
  worldDepth: 10.91,
  bandWidth: 0.06,
  bandStepDeg: 1,
  ruleWidth: 0.008,
  labelLaneWidth: 0.16,
  ink: '#3d2c20',
  bandOpacity: 0.92,
  lift: 0.004,
}

describe('degreeIndices', () => {
  describe('happy path', () => {
    it('lists every multiple of the step inside the range', () => {
      expect(degreeIndices(0, 10, 5)).toEqual([0, 1, 2])
    })
  })

  describe('variants', () => {
    it('works across zero, as a map spanning the meridian does', () => {
      expect(degreeIndices(-10, 10, 10)).toEqual([-1, 0, 1])
    })

    it('reads the range whichever way round it is given', () => {
      expect(degreeIndices(10, 0, 5)).toEqual(degreeIndices(0, 10, 5))
    })

    it('gives indices, not degrees, so the alternation is anchored to the degrees themselves', () => {
      // A band whose parity depended on where the map happened to be cropped would flip for no reason.
      expect(degreeIndices(20, 30, 10)).toEqual([2, 3])
    })
  })

  describe('managed errors', () => {
    it('lists nothing when no multiple falls inside', () => {
      expect(degreeIndices(1, 4, 10)).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a zero step rather than listing forever', () => {
      expect(degreeIndices(0, 1, 0).length).toBeLessThan(2_000_000)
    })
  })

  describe('edge cases', () => {
    it('includes a bound that falls exactly on a multiple', () => {
      expect(degreeIndices(10, 20, 10)).toEqual([1, 2])
    })
  })
})

describe('graduations', () => {
  describe('happy path', () => {
    it('places longitudes across the map, west to east', () => {
      const marks = graduations(OPTIONS, 'x', 10)
      expect(marks[0]?.at).toBeLessThan(marks[marks.length - 1]?.at ?? 0)
    })

    it('runs in order along the axis, whichever way the degrees do', () => {
      // North is v = 0, so ascending latitudes descend in Z. Taken unsorted the side bands came out as
      // two enormous segments spanning the whole map, which is what the border actually looked like.
      for (const axis of ['x', 'z'] as const) {
        const marks = graduations(OPTIONS, axis, 5)
        for (let i = 1; i < marks.length; i++) {
          expect(marks[i]?.at ?? 0).toBeGreaterThan(marks[i - 1]?.at ?? 0)
        }
      }
    })

    it('spans the map without leaving it', () => {
      for (const mark of graduations(OPTIONS, 'x', 10)) {
        expect(Math.abs(mark.at)).toBeLessThanOrEqual(OPTIONS.worldWidth / 2)
      }
    })
  })

  describe('variants', () => {
    it('spaces longitudes evenly, Mercator being linear in longitude', () => {
      const marks = graduations(OPTIONS, 'x', 10)
      const gaps = marks.slice(1).map((m, i) => m.at - (marks[i]?.at ?? 0))
      for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0] ?? 0, 4)
    })

    it('spreads latitudes out toward the north, as a Mercator chart does', () => {
      // The whole reason the graduations are computed rather than spaced: Mercator stretches latitude
      // toward the poles, so a degree takes MORE room the further north it is — 0.10 world units at
      // 15°N against 0.39 at 75°N on this map. Evenly spaced rungs would look wrong to anyone who has
      // held a chart.
      const marks = graduations(OPTIONS, 'z', 10)
      const gaps = marks.slice(1).map((m, i) => m.at - (marks[i]?.at ?? 0))
      // Sorted by position, and north is negative Z: the first gaps are the northern ones.
      expect(gaps[0] ?? 0).toBeGreaterThan(gaps[gaps.length - 1] ?? 0)
    })

    it('gives more marks for a finer step', () => {
      expect(graduations(OPTIONS, 'x', 1).length).toBeGreaterThan(
        graduations(OPTIONS, 'x', 10).length
      )
    })
  })

  describe('managed errors', () => {
    it('gives nothing for a step coarser than the map', () => {
      expect(graduations(OPTIONS, 'z', 720)).toHaveLength(0)
    })
  })

  describe('unmanaged errors', () => {
    it('keeps every latitude inside the map, however extreme the bounds', () => {
      const polar = { ...OPTIONS, bounds: { west: -45, south: -80, east: 78.75, north: 80 } }
      for (const mark of graduations(polar, 'z', 10)) {
        expect(Math.abs(mark.at)).toBeLessThanOrEqual(polar.worldDepth / 2 + 1e-6)
      }
    })
  })

  describe('edge cases', () => {
    it('reads one degree at a time without collapsing them', () => {
      const marks = graduations(OPTIONS, 'x', 1)
      expect(new Set(marks.map((m) => m.index)).size).toBe(marks.length)
    })
  })
})

describe('buildFrameQuads', () => {
  describe('happy path', () => {
    it('builds a frame of rectangles', () => {
      expect(buildFrameQuads(OPTIONS).length).toBeGreaterThan(100)
    })

    it('alternates ink and paper rather than inking everything', () => {
      // The anatomy still describes both, and only the inked ones are drawn: a light block is the
      // sheet showing through, which is the only way it can carry exactly the sheet's own fibre.
      const quads = buildFrameQuads(OPTIONS)
      expect(quads.some((q) => q.ink)).toBe(true)
      expect(quads.some((q) => !q.ink)).toBe(true)
    })
  })

  describe('variants', () => {
    it('cuts both side bands into as many blocks as the map has degrees', () => {
      // The east and west runs, which were two segments each before the graduations were sorted.
      const halfWidth = OPTIONS.worldWidth / 2
      const west = buildFrameQuads(OPTIONS).filter((q) => q.x1 <= -halfWidth + 1e-6)
      expect(west.length).toBeGreaterThan(20)
    })

    it('leaves the map itself untouched — every rectangle is outside it', () => {
      const halfWidth = OPTIONS.worldWidth / 2
      const halfDepth = OPTIONS.worldDepth / 2
      for (const q of buildFrameQuads(OPTIONS)) {
        const insideX = q.x0 > -halfWidth + 1e-6 && q.x1 < halfWidth - 1e-6
        const insideZ = q.z0 > -halfDepth + 1e-6 && q.z1 < halfDepth - 1e-6
        expect(insideX && insideZ).toBe(false)
      }
    })

    it('closes the corners, which a band per side would leave empty', () => {
      // A point in the middle of the north-west corner must fall inside some rectangle.
      const cornerX = -OPTIONS.worldWidth / 2 - OPTIONS.bandWidth / 2
      const cornerZ = -OPTIONS.worldDepth / 2 - OPTIONS.bandWidth / 2
      const covered = buildFrameQuads(OPTIONS).some(
        (q) => q.x0 <= cornerX && q.x1 >= cornerX && q.z0 <= cornerZ && q.z1 >= cornerZ
      )
      expect(covered).toBe(true)
    })

    it('rules the band on both sides, and closes the whole margin beyond the numbers', () => {
      // Three rings, as the reference has: one either side of the checker, and a last one outside the
      // lane the numbers are written in.
      const outer = Math.max(...buildFrameQuads(OPTIONS).map((q) => q.x1))
      const bare = Math.max(...buildFrameQuads({ ...OPTIONS, ruleWidth: 0 }).map((q) => q.x1))
      expect(bare).toBeCloseTo(OPTIONS.worldWidth / 2 + OPTIONS.bandWidth)
      expect(outer).toBeCloseTo(
        OPTIONS.worldWidth / 2 + OPTIONS.bandWidth + OPTIONS.labelLaneWidth + OPTIONS.ruleWidth * 3
      )
    })

    it('widens with the band', () => {
      const wide = buildFrameQuads({ ...OPTIONS, bandWidth: 0.5, ruleWidth: 0 })
      const outer = Math.max(...wide.map((q) => q.x1))
      expect(outer).toBeCloseTo(OPTIONS.worldWidth / 2 + 0.5)
    })
  })

  describe('managed errors', () => {
    it('nothing protrudes from the band, the checker being the graduation itself', () => {
      // The first attempt hung separate ticks off the outside. No chart does that: it says the same
      // thing twice and reads as a zebra crossing.
      const quads = buildFrameQuads({ ...OPTIONS, ruleWidth: 0 })
      const outer = Math.max(...quads.map((q) => q.x1))
      expect(outer).toBeCloseTo(OPTIONS.worldWidth / 2 + OPTIONS.bandWidth)
    })
  })

  describe('unmanaged errors', () => {
    it('still frames the map when the graduation is coarser than the map', () => {
      // No boundary falls inside, so the band is one long segment per side rather than nothing.
      const quads = buildFrameQuads({ ...OPTIONS, bandStepDeg: 500 })
      expect(quads.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('emits no degenerate rectangle', () => {
      for (const q of buildFrameQuads(OPTIONS)) {
        expect(q.x1).toBeGreaterThan(q.x0)
        expect(q.z1).toBeGreaterThan(q.z0)
      }
    })
  })
})

describe('createGraticuleFrame', () => {
  describe('happy path', () => {
    it('faces up, so a front-facing material draws it', () => {
      // The bug this exists for: hand-wound triangles taken the other way round point their normal at
      // the ground, the whole frame is back-facing, and a `FrontSide` material draws nothing at all.
      // Nothing about the scene says so — it simply is not there.
      const frame = createGraticuleFrame(OPTIONS)
      const mesh = frame.object as unknown as {
        geometry: { getAttribute: (name: string) => { array: Float32Array } }
      }
      const p = mesh.geometry.getAttribute('position').array
      const ax = p[0] ?? 0
      const az = p[2] ?? 0
      const bx = (p[3] ?? 0) - ax
      const bz = (p[5] ?? 0) - az
      const cx = (p[6] ?? 0) - ax
      const cz = (p[8] ?? 0) - az
      // The Y component of (AB x AC) for two vectors lying in the XZ plane.
      expect(bz * cx - bx * cz).toBeGreaterThan(0)
      frame.dispose()
    })
  })

  describe('variants', () => {
    it('carries a colour per vertex, so the whole frame is one draw call', () => {
      const frame = createGraticuleFrame(OPTIONS)
      const mesh = frame.object as unknown as {
        geometry: { getAttribute: (name: string) => { array: Float32Array } | undefined }
      }
      expect(mesh.geometry.getAttribute('color')).toBeDefined()
      frame.dispose()
    })
  })

  // L3 (managed errors): N/A — it turns rectangles into triangles and handles no failure of its own.

  describe('unmanaged errors', () => {
    it('builds an empty mesh rather than throwing when nothing is graduated', () => {
      const frame = createGraticuleFrame({
        ...OPTIONS,
        bandWidth: 0,
        ruleWidth: 0,
        bandStepDeg: 500,
      })
      expect(frame.object).toBeDefined()
      frame.dispose()
    })
  })

  describe('edge cases', () => {
    it('frees its geometry and material on teardown', () => {
      const frame = createGraticuleFrame(OPTIONS)
      expect(() => {
        frame.dispose()
      }).not.toThrow()
    })
  })
})

describe('frame draw order', () => {
  describe('happy path', () => {
    it('draws after the map, whatever the band opacity is', () => {
      // The defect this exists for: the frame writes no depth, so anything drawn after it paints over
      // it. At an opacity of 1 the material leaves the transparent queue, the mesh is sorted
      // front-to-back among the opaque ones, and the map's cut edge — further from the camera, so drawn
      // later — erased the entire band. An explicit order takes the question away from the slider.
      for (const bandOpacity of [0.5, 0.92, 1]) {
        const frame = createGraticuleFrame({ ...OPTIONS, bandOpacity })
        expect(frame.object.renderOrder).toBe(FRAME_RENDER_ORDER)
        frame.dispose()
      }
    })

    it('sits above the sheet it is printed on', () => {
      expect(FRAME_RENDER_ORDER).toBeGreaterThan(PAPER_SHEET_RENDER_ORDER)
    })
  })
})
