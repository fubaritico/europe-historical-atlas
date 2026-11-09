import { describe, expect, it, vi } from 'vitest'

import { HATCH_MAX_COLOURS } from '../data/hatchStripes'

import { hatchBuffers } from './hatchBuffers'

import type { OverlapHatch } from '../data/overlapHatches'

// ATLAS-399: the hatches cut on the relief like fills, each vertex with its piece's colours and their count.

const RED = { r: 255, g: 0, b: 0 }
const BLUE = { r: 0, g: 0, b: 255 }
const GREEN = { r: 0, g: 255, b: 0 }

/**
 * A square piece in `(u, v)`.
 * @param from - its north-west corner, on both axes
 * @param to - its south-east corner
 * @param colours - its polities' colours
 * @returns the piece
 */
function piece(from: number, to: number, colours: OverlapHatch['colours']): OverlapHatch {
  return {
    polities: colours.map((_, k) => `p${String(k)}`),
    colours,
    rings: [
      [
        { u: from, v: from },
        { u: to, v: from },
        { u: to, v: to },
        { u: from, v: to },
      ],
    ],
  }
}

/** A 4 × 4 relief, flat at height 2, on a 10 × 10 plane. */
const SURFACE = {
  grid: { segX: 4, segY: 4 },
  nodes: { array: new Float32Array(25).fill(2), stride: 1, offset: 0 },
  worldWidth: 10,
  worldDepth: 10,
}

describe('hatchBuffers', () => {
  describe('happy path', () => {
    it('lays a red and blue piece at the relief’s height, each vertex red first, blue second, two colours', () => {
      const { positions, colours, counts } = hatchBuffers(
        [piece(0.25, 0.75, [RED, BLUE])],
        SURFACE,
        vi.fn()
      )
      const ys = new Set(positions.filter((_, k) => k % 3 === 1))
      expect([
        ys,
        Array.from(colours[0]?.slice(0, 3) ?? []),
        Array.from(colours[1]?.slice(0, 3) ?? []),
        new Set(counts),
      ]).toEqual([new Set([2]), [255, 0, 0], [0, 0, 255], new Set([2])])
    })
  })

  describe('variants', () => {
    it('gives each piece its own colours and count, in order', () => {
      const { colours, counts } = hatchBuffers(
        [piece(0, 0.25, [RED, BLUE]), piece(0.5, 0.75, [GREEN, RED, BLUE])],
        SURFACE,
        vi.fn()
      )
      const last = counts.length - 1
      expect([counts[0], counts[last], colours[2]?.[3 * last + 2]]).toEqual([2, 3, 255])
    })
  })

  describe('managed errors', () => {
    it('stripes the first four of a piece of five and says it', () => {
      const warn = vi.fn()
      const { counts } = hatchBuffers(
        [piece(0.25, 0.75, [RED, BLUE, GREEN, RED, BLUE])],
        SURFACE,
        warn
      )
      expect([new Set(counts), warn.mock.calls.length]).toEqual([new Set([HATCH_MAX_COLOURS]), 1])
    })
  })

  describe('unmanaged errors', () => {
    it('holds one colour and one count per vertex laid, the last piece’s on its own vertices', () => {
      const { positions, colours, counts } = hatchBuffers(
        [piece(0, 0.25, [RED, BLUE]), piece(0.5, 0.75, [GREEN, RED, BLUE])],
        SURFACE,
        vi.fn()
      )
      const vertices = positions.length / 3
      expect([counts.length, colours.map((bytes) => bytes.length / 3)]).toEqual([
        vertices,
        [vertices, vertices, vertices, vertices],
      ])
    })
  })

  describe('edge cases', () => {
    it('lays nothing for a year without an overlap', () => {
      const { positions, indices, counts } = hatchBuffers([], SURFACE, vi.fn())
      expect([positions.length, indices.length, counts.length]).toEqual([0, 0, 0])
    })

    it('holds the four colour buffers whatever the count, the unused ones left black', () => {
      const { colours } = hatchBuffers([piece(0.25, 0.75, [RED, BLUE])], SURFACE, vi.fn())
      expect([colours.length, colours[3]?.every((byte) => byte === 0)]).toEqual([
        HATCH_MAX_COLOURS,
        true,
      ])
    })
  })
})
