import { describe, expect, it } from 'vitest'

import {
  EARTH_RADIUS_KM,
  boxesOverlap,
  paddedBox,
  signedDistanceField,
  unionDistanceField,
} from './signedDistance'

import type { GeoBounds } from './mercator'
import type { GridPoint } from './signedDistance'

/** One degree square on the equator: a degree of longitude is ~111.3 km, and so is one of latitude. */
const EQUATOR: GeoBounds = { west: 0, east: 1, south: -0.5, north: 0.5 }

/** The same degree square at 60°N, where a degree of longitude is half as long. */
const SIXTY: GeoBounds = { west: 0, east: 1, south: 59.5, north: 60.5 }

/** Kilometres in one degree of longitude on the equator. */
const KM_PER_DEGREE = (EARTH_RADIUS_KM * Math.PI) / 180

/** A square from 0.25 to 0.75 on both axes. */
const SQUARE: GridPoint[] = [
  { u: 0.25, v: 0.25 },
  { u: 0.75, v: 0.25 },
  { u: 0.75, v: 0.75 },
  { u: 0.25, v: 0.75 },
]

/** A hole from 0.4 to 0.6, inside {@link SQUARE}. */
const HOLE: GridPoint[] = [
  { u: 0.4, v: 0.4 },
  { u: 0.6, v: 0.4 },
  { u: 0.6, v: 0.6 },
  { u: 0.4, v: 0.6 },
]

/**
 * The signed distance by brute force: every edge, the even-odd rule, the local scale — what the buckets
 * must agree with.
 * @param rings - the rings
 * @param bounds - the grid's bounds
 * @param u - the point
 * @param v - the point
 * @param reach - the clamp
 * @returns km, negative inside
 */
function bruteForce(
  rings: GridPoint[][],
  bounds: GeoBounds,
  u: number,
  v: number,
  reach: number
): number {
  const rad = Math.PI / 180
  const my = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2))
  const sx = (bounds.east - bounds.west) * rad
  const sy = my(bounds.north) - my(bounds.south)
  const lat = (2 * Math.atan(Math.exp(my(bounds.north) - sy * v)) - Math.PI / 2) / rad
  const scale = EARTH_RADIUS_KM * Math.cos(lat * rad)
  const x = u * sx
  const y = v * sy
  let best = Infinity
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j]
      const b = ring[i]
      if (a === undefined || b === undefined) continue
      const [x0, y0, x1, y1] = [a.u * sx, a.v * sy, b.u * sx, b.v * sy]
      const dx = x1 - x0
      const dy = y1 - y0
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)))
      best = Math.min(best, Math.hypot(x - x0 - t * dx, y - y0 - t * dy))
      if (y0 > y !== y1 > y && x < ((x1 - x0) * (y - y0)) / (y1 - y0) + x0) inside = !inside
    }
  }
  const km = Math.min(reach, best * scale)
  return inside ? -km : km
}

describe('signedDistanceField', () => {
  describe('happy path', () => {
    it('reads the centre of a square 55.7 km across as 27.8 km inside, negative', () => {
      const distance = signedDistanceField([SQUARE], EQUATOR, 100)
      expect(distance(0.5, 0.5)).toBeCloseTo(-0.25 * KM_PER_DEGREE, 0)
    })

    it('reads a point 0.15° east of the square as 16.7 km outside, positive', () => {
      const distance = signedDistanceField([SQUARE], EQUATOR, 100)
      expect(distance(0.9, 0.5)).toBeCloseTo(0.15 * KM_PER_DEGREE, 0)
    })
  })

  describe('variants', () => {
    it('halves the kilometres at 60°N, where a degree of longitude is half as long', () => {
      const distance = signedDistanceField([SQUARE], SIXTY, 100)
      expect(distance(0.9, 0.5)).toBeCloseTo(0.15 * KM_PER_DEGREE * 0.5, 0)
    })

    it('reads a point in a hole as outside, by the even-odd rule', () => {
      const distance = signedDistanceField([SQUARE, HOLE], EQUATOR, 100)
      expect(distance(0.5, 0.5)).toBeCloseTo(0.1 * KM_PER_DEGREE, 0)
    })

    it('reads a point between the hole and the outer ring as inside, nearer the hole', () => {
      const distance = signedDistanceField([SQUARE, HOLE], EQUATOR, 100)
      expect(distance(0.33, 0.5)).toBeCloseTo(-0.07 * KM_PER_DEGREE, 0)
    })

    it('agrees with the brute force over a grid of points, holes and both sides included', () => {
      const rings = [SQUARE, HOLE]
      const reach = 30
      const distance = signedDistanceField(rings, SIXTY, reach)
      for (let i = 0; i <= 20; i++) {
        for (let j = 0; j <= 20; j++) {
          const u = i / 20
          const v = j / 20
          expect(distance(u, v)).toBeCloseTo(bruteForce(rings, SIXTY, u, v, reach), 6)
        }
      }
    })
  })

  describe('managed errors', () => {
    it('refuses a reach of zero', () => {
      expect(() => signedDistanceField([SQUARE], EQUATOR, 0)).toThrow(/reach/)
    })

    it('refuses a negative reach', () => {
      expect(() => signedDistanceField([SQUARE], EQUATOR, -5)).toThrow(/reach/)
    })

    it('refuses an infinite reach', () => {
      expect(() => signedDistanceField([SQUARE], EQUATOR, Infinity)).toThrow(/reach/)
    })
  })

  describe('unmanaged errors', () => {
    it('answers NaN for a point that is not a number, rather than far outside', () => {
      const distance = signedDistanceField([SQUARE], EQUATOR, 100)
      expect(distance(Number.NaN, 0.5)).toBeNaN()
      expect(distance(0.5, Number.NaN)).toBeNaN()
    })

    it('answers the reach, outside, everywhere for no rings', () => {
      expect(signedDistanceField([], EQUATOR, 40)(0.5, 0.5)).toBe(40)
    })

    it('reads a ring of two points as a line: near it, never inside', () => {
      const distance = signedDistanceField(
        [
          [
            { u: 0.2, v: 0.5 },
            { u: 0.8, v: 0.5 },
          ],
        ],
        EQUATOR,
        100
      )
      expect(distance(0.5, 0.6)).toBeCloseTo(0.1 * KM_PER_DEGREE, 0)
    })
  })

  describe('edge cases', () => {
    it('clamps a point far inside to minus the reach', () => {
      expect(signedDistanceField([SQUARE], EQUATOR, 10)(0.5, 0.5)).toBe(-10)
    })

    it('clamps a point far outside to the reach', () => {
      expect(signedDistanceField([SQUARE], EQUATOR, 10)(0.99, 0.01)).toBe(10)
    })

    it('reads a point on the outline as zero', () => {
      expect(Math.abs(signedDistanceField([SQUARE], EQUATOR, 100)(0.5, 0.25))).toBeLessThan(1e-9)
    })

    it('reads a ring that repeats its first point as the same ring', () => {
      const closed = [...SQUARE, { u: 0.25, v: 0.25 }]
      expect(signedDistanceField([closed], EQUATOR, 100)(0.6, 0.5)).toBeCloseTo(
        signedDistanceField([SQUARE], EQUATOR, 100)(0.6, 0.5),
        9
      )
    })

    // SEC-001: filing every bucket an edge's box touched looped billions of times on one far anchor.
    it('builds fast for a ring with an anchor at a longitude of 1e9, answering inside as the brute force', () => {
      const far: GridPoint[] = [
        { u: 0.25, v: 0.25 },
        { u: 0.75, v: 0.25 },
        { u: 1e9, v: 0.5 },
        { u: 0.75, v: 0.75 },
        { u: 0.25, v: 0.75 },
      ]
      const started = performance.now()
      const distance = signedDistanceField([far], EQUATOR, 30)
      expect(performance.now() - started).toBeLessThan(1000)
      for (let i = 0; i <= 10; i++) {
        for (let j = 0; j <= 10; j++) {
          const u = i / 10
          const v = j / 10
          expect(distance(u, v)).toBeCloseTo(bruteForce([far], EQUATOR, u, v, 30), 6)
        }
      }
    })

    it('finds the ring from a point north of it, where a bucket spans less ground', () => {
      const south = [
        { u: 0.4, v: 0.9 },
        { u: 0.6, v: 0.9 },
        { u: 0.6, v: 0.95 },
        { u: 0.4, v: 0.95 },
      ]
      const wide: GeoBounds = { west: 0, east: 10, south: 40, north: 70 }
      const distance = signedDistanceField([south], wide, 200)
      expect(distance(0.5, 0.75)).toBeCloseTo(bruteForce([south], wide, 0.5, 0.75, 200), 6)
    })
  })
})

describe('paddedBox', () => {
  describe('happy path', () => {
    it('grows a square by 11.1 km — 0.1° on the equator — on every side', () => {
      const box = paddedBox([SQUARE], EQUATOR, 0.1 * KM_PER_DEGREE)
      expect(box?.u0).toBeCloseTo(0.15, 3)
      expect(box?.u1).toBeCloseTo(0.85, 3)
      expect(box?.v0).toBeCloseTo(0.15, 3)
      expect(box?.v1).toBeCloseTo(0.85, 3)
    })
  })

  describe('variants', () => {
    it('grows it twice as far in degrees at 60°N, where a kilometre spans more longitude', () => {
      const box = paddedBox([SQUARE], SIXTY, 0.05 * KM_PER_DEGREE)
      expect(box?.u0).toBeLessThanOrEqual(0.15)
      expect(box?.u0).toBeGreaterThan(0.14)
    })

    it('leaves the box as it is for a margin of zero', () => {
      expect(paddedBox([SQUARE], EQUATOR, 0)).toEqual({ u0: 0.25, v0: 0.25, u1: 0.75, v1: 0.75 })
    })
  })

  describe('managed errors', () => {
    it('answers null for rings with no point', () => {
      expect(paddedBox([[]], EQUATOR, 10)).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — arithmetic over the points given; no input it cannot read.
    it('answers null for no rings at all', () => {
      expect(paddedBox([], EQUATOR, 10)).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('holds the grown box within the grid', () => {
      expect(paddedBox([SQUARE], EQUATOR, 1000)).toEqual({ u0: 0, v0: 0, u1: 1, v1: 1 })
    })
  })
})

describe('unionDistanceField', () => {
  const WHOLE = { u0: 0, v0: 0, u1: 1, v1: 1 }
  const LEFT: GridPoint[] = [
    { u: 0.1, v: 0.4 },
    { u: 0.3, v: 0.4 },
    { u: 0.3, v: 0.6 },
    { u: 0.1, v: 0.6 },
  ]
  const RIGHT: GridPoint[] = LEFT.map(({ u, v }) => ({ u: u + 0.6, v }))

  describe('happy path', () => {
    it('reads a point inside either polity as inside the union', () => {
      const union = unionDistanceField([[LEFT], [RIGHT]], EQUATOR, 50, WHOLE)
      expect(union(0.2, 0.5)).toBeLessThan(0)
      expect(union(0.8, 0.5)).toBeLessThan(0)
    })

    it('reads the gap between them as outside, the nearer one’s distance', () => {
      const union = unionDistanceField([[LEFT], [RIGHT]], EQUATOR, 50, WHOLE)
      expect(union(0.4, 0.5)).toBeCloseTo(0.1 * KM_PER_DEGREE, 0)
    })
  })

  describe('variants', () => {
    it('does not read two overlapping polities as a hole, as one even-odd set would', () => {
      const shifted = LEFT.map(({ u, v }) => ({ u: u + 0.1, v }))
      const union = unionDistanceField([[LEFT], [shifted]], EQUATOR, 50, WHOLE)
      expect(union(0.25, 0.5)).toBeLessThan(0)
    })

    it('leaves out a polity far from the box it is asked over', () => {
      const union = unionDistanceField([[RIGHT]], EQUATOR, 5, { u0: 0, v0: 0, u1: 0.2, v1: 0.2 })
      expect(union(0.8, 0.5)).toBe(5)
    })
  })

  describe('managed errors', () => {
    it('refuses a reach of zero, even with no polity near', () => {
      expect(() => unionDistanceField([], EQUATOR, 0, WHOLE)).toThrow(/reach/)
    })
  })

  describe('unmanaged errors', () => {
    it('answers NaN for a point that is not a number', () => {
      expect(unionDistanceField([[LEFT]], EQUATOR, 50, WHOLE)(Number.NaN, 0.5)).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('answers the reach everywhere for no polity', () => {
      expect(unionDistanceField([], EQUATOR, 7, WHOLE)(0.5, 0.5)).toBe(7)
    })
  })
})

describe('boxesOverlap', () => {
  it('reads two boxes sharing an edge as overlapping, and two apart as not', () => {
    const a = { u0: 0, v0: 0, u1: 0.5, v1: 0.5 }
    expect(boxesOverlap(a, { u0: 0.5, v0: 0, u1: 1, v1: 0.5 })).toBe(true)
    expect(boxesOverlap(a, { u0: 0.6, v0: 0, u1: 1, v1: 0.5 })).toBe(false)
  })
})
