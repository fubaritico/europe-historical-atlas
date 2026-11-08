import { describe, expect, it } from 'vitest'

import { fillTriangles } from './fillTriangles'
import { indexFill } from './indexFill'

/**
 * The triangles a fill's indices draw, back as flat `u, v`.
 * @param fill - the shared fill
 * @param fill.vertices - its distinct vertices
 * @param fill.indices - its triangles' indices
 * @returns three vertices a triangle
 */
function unshared({ vertices, indices }: ReturnType<typeof indexFill>): number[] {
  return Array.from(indices).flatMap((index) => [
    vertices[2 * index] ?? Number.NaN,
    vertices[2 * index + 1] ?? Number.NaN,
  ])
}

// ATLAS-333: a fill's vertices shared, the same triangles drawn.
describe('indexFill', () => {
  describe('happy path', () => {
    it('draws the very triangles it was given', () => {
      const square = [
        { u: 0.1, v: 0.1 },
        { u: 0.9, v: 0.1 },
        { u: 0.9, v: 0.9 },
        { u: 0.1, v: 0.9 },
      ]
      const [triangles] = fillTriangles([{ rings: [square] }], { segX: 8, segY: 8 })
      if (triangles === undefined) throw new Error('test: no fill')
      expect(unshared(indexFill(triangles))).toEqual(Array.from(triangles))
    })

    it('keeps each vertex once: two triangles of a cell share their diagonal', () => {
      const cell = Float32Array.from([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1])
      const { vertices, indices } = indexFill(cell)
      expect([vertices.length / 2, Array.from(indices)]).toEqual([4, [0, 1, 2, 1, 3, 2]])
    })
  })

  describe('variants', () => {
    it('shares far more than it keeps over a polity cut on a fine grid', () => {
      const square = [
        { u: 0.1, v: 0.1 },
        { u: 0.9, v: 0.1 },
        { u: 0.9, v: 0.9 },
        { u: 0.1, v: 0.9 },
      ]
      const [triangles] = fillTriangles([{ rings: [square] }], { segX: 64, segY: 64 })
      if (triangles === undefined) throw new Error('test: no fill')
      const { vertices } = indexFill(triangles)
      expect(vertices.length).toBeLessThan(triangles.length / 4)
    })
  })

  describe('edge cases', () => {
    it('shares nothing of an empty fill', () => {
      const { vertices, indices } = indexFill(new Float32Array(0))
      expect([vertices.length, indices.length]).toEqual([0, 0])
    })

    it('keeps two points apart one 2⁻²⁴ step from each other', () => {
      const near = Float32Array.from([0.75, 0.5, 0.75 + 2 ** -24, 0.5, 0.5, 0.25])
      expect(indexFill(near).vertices.length / 2).toBe(3)
    })

    it('merges two 32-bit floats a quarter step apart, which round to one point of the grid', () => {
      const near = Float32Array.from([0.125, 0.5, 0.125 + 2 ** -26, 0.5, 0.5, 0.25])
      expect(indexFill(near).vertices.length / 2).toBe(2)
    })

    it('keeps a point just past the edge apart from the next column’s, at the bottom', () => {
      const edge = Float32Array.from([0.5, 1 + 2 ** -23, 0.5 + 2 ** -24, 2 ** -24, 0.25, 0.25])
      expect(indexFill(edge).vertices.length / 2).toBe(3)
    })
  })

  // L3, L4: N/A — nothing is refused; a malformed cut is fillTriangles' own.
})
