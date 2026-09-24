import { describe, expect, it } from 'vitest'

import { MARCHING_SQUARES_EDGES, cornerCode } from './coastlineSource'
import { boxBlurAxis } from './heightmap'
import { affordableRounds, smoothChain } from './regionBorders'

describe('cornerCode', () => {
  describe('happy path', () => {
    it('reads all-water as zero and all-land as fifteen', () => {
      expect(cornerCode(-1, -1, -1, -1, 0)).toBe(0)
      expect(cornerCode(1, 1, 1, 1, 0)).toBe(15)
    })
  })

  describe('variants', () => {
    it('puts top-left in the high bit and goes clockwise', () => {
      expect(cornerCode(1, 0, 0, 0, 0)).toBe(8)
      expect(cornerCode(0, 1, 0, 0, 0)).toBe(4)
      expect(cornerCode(0, 0, 1, 0, 0)).toBe(2)
      expect(cornerCode(0, 0, 0, 1, 0)).toBe(1)
    })
  })

  describe('managed errors', () => {
    it('treats a corner exactly at the level as water, the test being strict', () => {
      expect(cornerCode(0, 0, 0, 0, 0)).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    it('reads a non-finite corner as water rather than as land', () => {
      expect(cornerCode(Number.NaN, 0, 0, 0, 0)).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('follows a level moved off zero', () => {
      expect(cornerCode(50, 50, 50, 50, 100)).toBe(0)
      expect(cornerCode(150, 150, 150, 150, 100)).toBe(15)
    })
  })
})

describe('MARCHING_SQUARES_EDGES', () => {
  describe('happy path', () => {
    it('has one row per corner code', () => {
      expect(MARCHING_SQUARES_EDGES).toHaveLength(16)
    })
  })

  describe('variants', () => {
    it('draws nothing where every corner agrees', () => {
      expect(MARCHING_SQUARES_EDGES[0]).toHaveLength(0)
      expect(MARCHING_SQUARES_EDGES[15]).toHaveLength(0)
    })

    it('draws two stretches for the two saddles, and one everywhere else', () => {
      const twoStretches = MARCHING_SQUARES_EDGES.flatMap((row, code) =>
        row.length === 2 ? [code] : []
      )
      expect(twoStretches).toEqual([5, 10])
    })
  })

  describe('managed errors', () => {
    it('gives a code and its inverse the same crossings, which is what makes the table symmetric', () => {
      // Swapping land for water cannot move the shoreline, so row n and row 15-n must agree.
      for (let code = 1; code < 15; code++) {
        if (code === 5 || code === 10) continue // the saddles are each their own inverse
        expect(MARCHING_SQUARES_EDGES[code]).toEqual(MARCHING_SQUARES_EDGES[15 - code])
      }
    })
  })

  describe('unmanaged errors', () => {
    it('names only the four edges that exist', () => {
      for (const row of MARCHING_SQUARES_EDGES) {
        for (const [from, to] of row) {
          expect(from).toBeGreaterThanOrEqual(0)
          expect(from).toBeLessThan(4)
          expect(to).toBeGreaterThanOrEqual(0)
          expect(to).toBeLessThan(4)
          expect(from).not.toBe(to)
        }
      }
    })
  })

  describe('edge cases', () => {
    it('keeps the two stretches of a saddle apart, isolating each land corner', () => {
      const saddle = MARCHING_SQUARES_EDGES[5] ?? []
      const used = saddle.flatMap(([a, b]) => [a, b])
      expect(new Set(used).size).toBe(4)
    })
  })
})

describe('boxBlurAxis', () => {
  describe('happy path', () => {
    it('averages a spike into its neighbours along a row', () => {
      const out = new Float32Array(3)
      boxBlurAxis([0, 3, 0], out, 3, 1, 1, 'row')
      expect([...out]).toEqual([1.5, 1, 1.5])
    })
  })

  describe('variants', () => {
    it('blurs down a column even on a grid one cell wide, where the stride cannot say which axis', () => {
      const out = new Float32Array(3)
      boxBlurAxis([0, 3, 0], out, 1, 3, 1, 'column')
      expect([...out]).toEqual([1.5, 1, 1.5])
    })

    it('leaves the samples alone at radius zero', () => {
      const out = new Float32Array(3)
      boxBlurAxis([0, 3, 0], out, 3, 1, 0, 'row')
      expect([...out]).toEqual([0, 3, 0])
    })

    it('reaches further with a larger radius', () => {
      const out = new Float32Array(5)
      boxBlurAxis([0, 0, 5, 0, 0], out, 5, 1, 2, 'row')
      expect(out[0]).toBeGreaterThan(0)
    })
  })

  describe('managed errors', () => {
    it('averages only the taps that exist at an edge, rather than repeating the edge value', () => {
      // Index 0 sees itself and its one right-hand neighbour: (0 + 3) / 2, not (0 + 0 + 3) / 3.
      const out = new Float32Array(3)
      boxBlurAxis([0, 3, 0], out, 3, 1, 1, 'row')
      expect(out[0]).toBe(1.5)
    })
  })

  describe('unmanaged errors', () => {
    it('reads a missing sample as zero rather than as garbage', () => {
      const out = new Float32Array(3)
      boxBlurAxis([], out, 3, 1, 1, 'row')
      expect([...out]).toEqual([0, 0, 0])
    })
  })

  describe('edge cases', () => {
    it('holds up on a single sample', () => {
      const out = new Float32Array(1)
      boxBlurAxis([7], out, 1, 1, 3, 'row')
      expect(out[0]).toBe(7)
    })
  })
})

describe('affordableRounds', () => {
  describe('happy path', () => {
    it('grants every round a small border can afford', () => {
      expect(affordableRounds(100, 2)).toBe(2)
    })
  })

  describe('variants', () => {
    it('spends the budget in rounds, never in edges', () => {
      // A border of a million edges cannot be smoothed twice, but not one edge is dropped for it.
      expect(affordableRounds(1_000_000, 4)).toBeLessThan(4)
    })

    it('grants nothing when none was asked for', () => {
      expect(affordableRounds(10, 0)).toBe(0)
    })
  })

  describe('managed errors', () => {
    it('never goes below zero, however many edges there are', () => {
      expect(affordableRounds(Number.MAX_SAFE_INTEGER, 4)).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    it('grants every round for an empty border', () => {
      expect(affordableRounds(0, 4)).toBe(4)
    })
  })

  describe('edge cases', () => {
    it('is monotone: more edges never buys more rounds', () => {
      expect(affordableRounds(500_000, 4)).toBeLessThanOrEqual(affordableRounds(1000, 4))
    })
  })
})

describe('smoothChain', () => {
  // A 4x4 lattice over a 2x2 grid; keys are (y+1) * stride + (x+1) on doubled integers.
  const stride = 8
  const key = (x: number, y: number): number => (y + 1) * stride + (x + 1)

  describe('happy path', () => {
    it('decodes a chain of keys into points', () => {
      expect(smoothChain([key(1, 1), key(3, 1)], stride, 3, 3, 0)).toHaveLength(2)
    })
  })

  describe('variants', () => {
    it('adds points with every smoothing round', () => {
      const line = [key(1, 1), key(3, 1), key(3, 3)]
      expect(smoothChain(line, stride, 3, 3, 1).length).toBeGreaterThan(
        smoothChain(line, stride, 3, 3, 0).length
      )
    })

    it('leaves the chain untouched at zero rounds', () => {
      const line = [key(1, 1), key(3, 1), key(3, 3)]
      expect(smoothChain(line, stride, 3, 3, 0)).toHaveLength(3)
    })
  })

  describe('managed errors', () => {
    it('closes a ring back on itself, so no seam shows where it was cut', () => {
      const ring = [key(1, 1), key(3, 1), key(3, 3), key(1, 3), key(1, 1)]
      const smoothed = smoothChain(ring, stride, 3, 3, 1)
      expect(smoothed[0]).toEqual(smoothed[smoothed.length - 1])
    })
  })

  describe('unmanaged errors', () => {
    it('returns nothing for an empty chain', () => {
      expect(smoothChain([], stride, 3, 3, 2)).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('does not mistake a short chain that repeats a key for a ring', () => {
      // Three keys cannot enclose anything once the repeat is discounted.
      expect(smoothChain([key(1, 1), key(3, 1), key(1, 1)], stride, 3, 3, 0)).toHaveLength(3)
    })
  })
})
