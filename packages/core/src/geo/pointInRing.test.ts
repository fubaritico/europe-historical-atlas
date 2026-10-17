import { describe, expect, it } from 'vitest'

import { indexRings, pointInIndexedRings, pointInRing, pointInRings } from './pointInRing'

/** A unit square, counter-clockwise, closure implied. */
const square: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
]

/** A smaller square inside it, which even-odd turns into a hole. */
const inner: [number, number][] = [
  [3, 3],
  [7, 3],
  [7, 7],
  [3, 7],
]

describe('pointInRing', () => {
  describe('happy path', () => {
    it('says yes for a point in the middle', () => {
      expect(pointInRing([5, 5], square)).toBe(true)
    })

    it('says no for a point outside', () => {
      expect(pointInRing([20, 5], square)).toBe(false)
      expect(pointInRing([-1, 5], square)).toBe(false)
      expect(pointInRing([5, 20], square)).toBe(false)
    })
  })

  describe('variants', () => {
    it('works on a ring wound the other way', () => {
      expect(pointInRing([5, 5], [...square].reverse())).toBe(true)
    })

    it('tolerates a ring that repeats its first vertex at the end', () => {
      expect(pointInRing([5, 5], [...square, [0, 0]])).toBe(true)
    })

    it('handles a concave shape, where a bounding box would be wrong', () => {
      // An L: the point sits inside the box and outside the shape.
      const ell: [number, number][] = [
        [0, 0],
        [10, 0],
        [10, 3],
        [3, 3],
        [3, 10],
        [0, 10],
      ]
      expect(pointInRing([7, 7], ell)).toBe(false)
      expect(pointInRing([1, 7], ell)).toBe(true)
    })

    it('handles negative longitudes, which half our frame has', () => {
      const west: [number, number][] = [
        [-45, 40],
        [-30, 40],
        [-30, 50],
        [-45, 50],
      ]
      expect(pointInRing([-40, 45], west)).toBe(true)
      expect(pointInRing([-20, 45], west)).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('says no for a ring with nothing in it', () => {
      expect(pointInRing([5, 5], [])).toBe(false)
    })

    it('says no for a ring that cannot enclose anything', () => {
      expect(
        pointInRing(
          [5, 5],
          [
            [0, 0],
            [10, 0],
          ]
        )
      ).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    // L4: pure arithmetic, no async, no collaborator.

    it('does not count a vertex the ray passes through twice', () => {
      // The reason the crossing test is written the long way: the symmetric form double-counts a vertex
      // exactly on the ray and flips the answer for a whole column of queries.
      const diamond: [number, number][] = [
        [5, 0],
        [10, 5],
        [5, 10],
        [0, 5],
      ]
      expect(pointInRing([5, 5], diamond)).toBe(true)
      expect(pointInRing([11, 5], diamond)).toBe(false)
      expect(pointInRing([-1, 5], diamond)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('is stable for a point far outside in both directions', () => {
      expect(pointInRing([1e6, 1e6], square)).toBe(false)
      expect(pointInRing([-1e6, -1e6], square)).toBe(false)
    })
  })
})

describe('pointInRings', () => {
  describe('happy path', () => {
    it('says yes inside the outer ring', () => {
      expect(pointInRings([1, 1], [square])).toBe(true)
    })
  })

  describe('variants', () => {
    it('treats a ring inside a ring as a hole, with nothing declaring it', () => {
      expect(pointInRings([5, 5], [square, inner])).toBe(false)
      expect(pointInRings([1, 1], [square, inner])).toBe(true)
    })

    it('treats two disjoint rings as two pieces, which never cancel', () => {
      const exclave: [number, number][] = [
        [20, 0],
        [25, 0],
        [25, 5],
        [20, 5],
      ]
      expect(pointInRings([5, 5], [square, exclave])).toBe(true)
      expect(pointInRings([22, 2], [square, exclave])).toBe(true)
      expect(pointInRings([15, 2], [square, exclave])).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('says no when a polity holds nothing', () => {
      expect(pointInRings([5, 5], [])).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('ignores a ring too small to enclose anything', () => {
      expect(pointInRings([5, 5], [square, [[1, 1]]])).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles a hole inside a hole, which is solid again', () => {
      const core: [number, number][] = [
        [4, 4],
        [6, 4],
        [6, 6],
        [4, 6],
      ]
      expect(pointInRings([5, 5], [square, inner, core])).toBe(true)
    })
  })
})

/** A deterministic pseudo-random sequence, so a failing case can be replayed. */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

/** A jagged star ring around a centre — a fjord coast in miniature, many vertices, concave everywhere. */
function jaggedRing(
  random: () => number,
  cx: number,
  cy: number,
  vertices: number
): [number, number][] {
  return Array.from({ length: vertices }, (_, i) => {
    const angle = (i / vertices) * Math.PI * 2
    const radius = 1 + random() * 3
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as [number, number]
  })
}

describe('pointInIndexedRings', () => {
  describe('happy path', () => {
    it('answers inside and outside like pointInRings for a square', () => {
      const square: [number, number][][] = [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
        ],
      ]
      const index = indexRings(square)

      expect(pointInIndexedRings([5, 5], index)).toBe(true)
      expect(pointInIndexedRings([15, 5], index)).toBe(false)
    })
  })

  describe('variants', () => {
    it('agrees with pointInRings on 20 000 points over jagged rings, holes and exclaves', () => {
      // The guarantee the speed-up rests on: the same answer, everywhere — CARTO-240.
      const random = seeded(1100)
      const outer = jaggedRing(random, 0, 0, 900)
      const rings = [
        outer,
        jaggedRing(random, 0, 0, 120).map(([x, y]) => [x * 0.2, y * 0.2] as [number, number]),
        jaggedRing(random, 12, 3, 300),
      ]
      const index = indexRings(rings)
      let disagreements = 0
      for (let i = 0; i < 20000; i += 1) {
        const point: [number, number] = [-6 + random() * 22, -6 + random() * 12]
        if (pointInIndexedRings(point, index) !== pointInRings(point, rings)) disagreements += 1
      }

      expect(disagreements).toBe(0)
    })

    it('agrees with pointInRings on points exactly at vertex latitudes, where the ray grazes a vertex', () => {
      const random = seeded(17)
      const rings = [jaggedRing(random, 0, 0, 400)]
      const index = indexRings(rings)
      const disagreements = (rings[0] ?? []).filter(([, y]) => {
        const point: [number, number] = [random() * 2 - 1, y]
        return pointInIndexedRings(point, index) !== pointInRings(point, rings)
      })

      expect(disagreements).toEqual([])
    })
  })

  // L3: N/A — the index refuses nothing; every ring shape is answered as pointInRings answers it.

  describe('unmanaged errors', () => {
    it('answers outside for no ring at all', () => {
      expect(pointInIndexedRings([0, 0], indexRings([]))).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('answers like pointInRings for a ring with no height, every edge horizontal', () => {
      const flat: [number, number][][] = [
        [
          [0, 1],
          [5, 1],
          [9, 1],
        ],
      ]

      expect(pointInIndexedRings([3, 1], indexRings(flat))).toBe(pointInRings([3, 1], flat))
    })

    it("answers for points on the box's northern and southern edges as pointInRings does", () => {
      const random = seeded(3)
      const rings = [jaggedRing(random, 0, 0, 200)]
      const index = indexRings(rings)

      for (const y of [index.box.north, index.box.south])
        for (const x of [-2, 0, 2])
          expect(pointInIndexedRings([x, y], index)).toBe(pointInRings([x, y], rings))
    })

    it('cancels two rings enclosing the same ground, as the even-odd rule does', () => {
      const square: [number, number][] = [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ]

      expect(pointInIndexedRings([2, 2], indexRings([square, square]))).toBe(false)
    })
  })
})
