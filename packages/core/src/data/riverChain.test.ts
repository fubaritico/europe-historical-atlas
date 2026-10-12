import { describe, expect, it } from 'vitest'

import { mendRivers } from './riverChain'

import type { River } from './riverSource'

/**
 * A river piece from `[u, v]` pairs.
 * @param name - its name, or `null`
 * @param points - its points in grid units
 * @param rank - its scalerank
 * @returns the piece
 */
function piece(name: string | null, points: [number, number][], rank = 5): River {
  return { name, rank, kind: 'River', points: points.map(([u, v]) => ({ u, v })) }
}

/** The points of a mended river, as pairs, for readable assertions. */
function pairs(river: River | undefined): [number, number][] {
  return (river?.points ?? []).map((point) => [point.u, point.v])
}

describe('mendRivers', () => {
  describe('happy path', () => {
    it('joins three pieces laid end to end into one river, the meeting points kept once', () => {
      // The Loire as shipped: source → Nevers, Nevers → Decize, Decize → ocean, listed out of order.
      const mended = mendRivers([
        piece('Loire', [
          [0.5, 0.5],
          [0.6, 0.5],
          [0.7, 0.5],
        ]),
        piece('Loire', [
          [0.3, 0.5],
          [0.4, 0.5],
          [0.5, 0.5],
        ]),
        piece('Loire', [
          [0.1, 0.5],
          [0.2, 0.5],
          [0.3, 0.5],
        ]),
      ])

      expect(mended.rivers).toHaveLength(1)
      expect(pairs(mended.rivers[0])).toEqual([
        [0.1, 0.5],
        [0.2, 0.5],
        [0.3, 0.5],
        [0.4, 0.5],
        [0.5, 0.5],
        [0.6, 0.5],
        [0.7, 0.5],
      ])
      expect(mended.joined).toBe(2)
    })

    it('drops a 2-point fragment beside the real course of the same river', () => {
      // The Meuse at Charleville-Mézières: a 500 m stub, 1.3 km from the main course.
      const mended = mendRivers([
        piece('Maas', [
          [0.1, 0.1],
          [0.1, 0.2],
          [0.1, 0.3],
        ]),
        piece('Maas', [
          [0.15, 0.2],
          [0.151, 0.2],
        ]),
      ])

      expect(mended.rivers).toHaveLength(1)
      expect(mended.dropped).toBe(1)
    })
  })

  describe('variants', () => {
    it('joins a piece listed the other way round, reversing it', () => {
      const mended = mendRivers([
        piece('Loire', [
          [0.1, 0.5],
          [0.2, 0.5],
          [0.3, 0.5],
        ]),
        piece('Loire', [
          [0.5, 0.5],
          [0.4, 0.5],
          [0.3, 0.5],
        ]),
      ])

      expect(pairs(mended.rivers[0])).toEqual([
        [0.1, 0.5],
        [0.2, 0.5],
        [0.3, 0.5],
        [0.4, 0.5],
        [0.5, 0.5],
      ])
    })

    it('joins ends that the payload rounded two ways, within the tolerance', () => {
      // The Loire at Decize: the same point rounded two ways, 0.0001° apart — about 8·10⁻⁷ of the grid.
      // A literal, not a fraction of the tolerance: a tolerance sabotaged to zero must fail this test.
      const gap = 8e-7
      const mended = mendRivers([
        piece('Loire', [
          [0.1, 0.5],
          [0.2, 0.5],
          [0.3, 0.5],
        ]),
        piece('Loire', [
          [0.3 + gap, 0.5],
          [0.4, 0.5],
          [0.5, 0.5],
        ]),
      ])

      expect(mended.rivers).toHaveLength(1)
    })

    it('keeps the more important rank of the pieces it joins', () => {
      const mended = mendRivers([
        piece(
          'Loire',
          [
            [0.1, 0.5],
            [0.2, 0.5],
            [0.3, 0.5],
          ],
          6
        ),
        piece(
          'Loire',
          [
            [0.3, 0.5],
            [0.4, 0.5],
            [0.5, 0.5],
          ],
          4
        ),
      ])

      expect(mended.rivers[0]?.rank).toBe(4)
    })
  })

  describe('managed errors', () => {
    it('never joins at a fork, where two arms leave the same point', () => {
      // The Rhône at Arles: the course from Geneva ends where the Petit and the Grand Rhône begin.
      const mended = mendRivers([
        piece('Rhône', [
          [0.5, 0.1],
          [0.5, 0.2],
          [0.5, 0.3],
        ]),
        piece('Rhône', [
          [0.5, 0.3],
          [0.45, 0.35],
          [0.4, 0.4],
        ]),
        piece('Rhône', [
          [0.5, 0.3],
          [0.55, 0.35],
          [0.6, 0.4],
        ]),
      ])

      expect(mended.rivers).toHaveLength(3)
      expect(mended.joined).toBe(0)
    })

    it('does not join two rivers of different names that happen to meet', () => {
      // A confluence: the Saône ends in the Rhône at Lyon.
      const mended = mendRivers([
        piece('Sane', [
          [0.5, 0.1],
          [0.5, 0.2],
          [0.5, 0.3],
        ]),
        piece('Rhône', [
          [0.5, 0.3],
          [0.5, 0.4],
          [0.5, 0.5],
        ]),
      ])

      expect(mended.rivers).toHaveLength(2)
    })

    it('does not join ends further apart than the tolerance', () => {
      // The Rhône stub at Arles: two ends 160 m apart — about 1.3·10⁻⁵ of the grid — are two ends.
      const mended = mendRivers([
        piece('Maas', [
          [0.1, 0.5],
          [0.2, 0.5],
          [0.3, 0.5],
        ]),
        piece('Maas', [
          [0.3 + 1.3e-5, 0.5],
          [0.4, 0.5],
          [0.5, 0.5],
        ]),
      ])

      expect(mended.rivers).toHaveLength(2)
    })
  })

  describe('unmanaged errors', () => {
    it('leaves unnamed centrelines as they are, even when they meet', () => {
      const mended = mendRivers([
        piece(null, [
          [0.1, 0.5],
          [0.2, 0.5],
          [0.3, 0.5],
        ]),
        piece(null, [
          [0.3, 0.5],
          [0.4, 0.5],
          [0.5, 0.5],
        ]),
      ])

      expect(mended.rivers).toHaveLength(2)
    })

    it('keeps a river made only of 2-point pieces — they are all there is of it', () => {
      const mended = mendRivers([
        piece('Brook', [
          [0.1, 0.1],
          [0.2, 0.2],
        ]),
      ])

      expect(mended.rivers).toHaveLength(1)
      expect(mended.dropped).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('changes nothing for a river already in one piece', () => {
      const one = piece('Schelde', [
        [0.1, 0.1],
        [0.2, 0.2],
        [0.3, 0.3],
      ])

      expect(mendRivers([one]).rivers).toEqual([one])
    })

    it('returns nothing for nothing', () => {
      expect(mendRivers([])).toEqual({ rivers: [], dropped: 0, joined: 0 })
    })
  })
})
