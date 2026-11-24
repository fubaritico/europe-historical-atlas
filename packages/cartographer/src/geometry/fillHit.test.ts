import { describe, expect, it } from 'vitest'

import { insideRings, politiesLocator, polityAt, polityLocator } from './fillHit'

import type { Point } from '../viewport/viewport'

/** A square from (x, y) to (x + size, y + size). */
function square(x: number, y: number, size: number): Point[] {
  return [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size],
  ]
}

const KINGDOM = { polity: 'fr', rings: [square(0, 0, 100)] }
const DUCHY = { polity: 'aq', rings: [square(20, 20, 30)] }

describe('fillHit', () => {
  describe('happy path', () => {
    it('finds the polity whose territory is under the pointer', () => {
      expect(polityAt([KINGDOM], [50, 50])).toBe('fr')
    })
  })

  describe('variants', () => {
    // The one painted last is on top: the duchy drawn inside its kingdom.
    it('takes the polity painted last where two overlap', () => {
      expect(polityAt([KINGDOM, DUCHY], [30, 30])).toBe('aq')
      expect(polityAt([KINGDOM, DUCHY], [80, 80])).toBe('fr')
    })

    it('finds a second piece of the same polity', () => {
      expect(
        polityAt([{ polity: 'fr', rings: [square(0, 0, 10), square(50, 50, 10)] }], [55, 55])
      ).toBe('fr')
    })
  })

  describe('managed errors', () => {
    it('finds nobody over unclaimed ground', () => {
      expect(polityAt([KINGDOM], [150, 50])).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('finds nobody in a ring of fewer than three points', () => {
      expect(
        insideRings(
          [
            [
              [0, 0],
              [10, 10],
            ],
          ],
          [5, 5]
        )
      ).toBe(false)
    })
  })

  describe('edge cases', () => {
    // H-07: a ring inside another of the same claim is a hole.
    it('finds nobody in a hole', () => {
      const holed = { polity: 'pl', rings: [square(0, 0, 100), square(40, 40, 20)] }
      expect(polityAt([holed], [50, 50])).toBeNull()
      expect(polityAt([holed], [10, 10])).toBe('pl')
    })

    it('finds nobody when there is no territory at all', () => {
      expect(polityAt([], [0, 0])).toBeNull()
    })
  })
})

/**
 * A ring of teeth: a comb from x = 0 to x = 100, its back along y = 0 and each tooth reaching y = 60 — long edges
 * crossing many heights, and short ones, so its edges sit in several bands.
 * @returns the ring, forty-two points
 */
function comb(): Point[] {
  const ring: Point[] = [[0, 0]]
  for (let tooth = 0; tooth < 10; tooth += 1) {
    const x = tooth * 10
    ring.push([x, 60], [x + 5, 60], [x + 5, 10], [x + 10, 10])
  }
  ring.push([100, 0])
  return ring
}

/**
 * Every point of a grid over and around the comb, off the ring's own lines.
 * @returns the points
 */
function grid(): Point[] {
  const points: Point[] = []
  for (let x = -7.3; x < 110; x += 2.9) for (let y = -7.1; y < 70; y += 2.3) points.push([x, y])
  return points
}

// CARTO-485: the same question asked for thirteen thousand cities, each ring prepared once.
describe('polityLocator', () => {
  describe('happy path', () => {
    it('finds the polity whose territory is under the point', () => {
      expect(polityLocator([KINGDOM])([50, 50])).toBe('fr')
    })
  })

  describe('variants', () => {
    it('takes the polity painted last where two overlap', () => {
      const locate = polityLocator([KINGDOM, DUCHY])
      expect([locate([30, 30]), locate([80, 80])]).toEqual(['aq', 'fr'])
    })

    it('finds a second piece of the same polity', () => {
      const locate = polityLocator([
        { polity: 'fr', rings: [square(0, 0, 10), square(50, 50, 10)] },
      ])
      expect(locate([55, 55])).toBe('fr')
    })

    it('answers as polityAt does at every point of a grid over a comb of long and short edges', () => {
      const territories = [KINGDOM, { polity: 'comb', rings: [comb()] }]
      const locate = polityLocator(territories)
      const differing = grid().filter((at) => locate(at) !== polityAt(territories, at))
      expect(differing).toEqual([])
    })

    it('finds the comb between two of its teeth only on its back', () => {
      const locate = polityLocator([{ polity: 'comb', rings: [comb()] }])
      expect([locate([7, 5]), locate([7, 30]), locate([2, 30])]).toEqual(['comb', null, 'comb'])
    })
  })

  describe('managed errors', () => {
    it('finds nobody over unclaimed ground', () => {
      expect(polityLocator([KINGDOM])([150, 50])).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('finds nobody in a ring of fewer than three points', () => {
      const line = {
        polity: 'line',
        rings: [
          [
            [0, 0],
            [10, 10],
          ] as Point[],
        ],
      }
      expect(polityLocator([line])([5, 5])).toBeNull()
    })

    it('finds nobody in a ring with no height', () => {
      const flat = {
        polity: 'flat',
        rings: [
          [
            [0, 5],
            [10, 5],
            [20, 5],
          ] as Point[],
        ],
      }
      expect(polityLocator([flat])([10, 5])).toBeNull()
    })
  })

  describe('edge cases', () => {
    // H-07: a ring inside another of the same claim is a hole.
    it('finds nobody in a hole', () => {
      const locate = polityLocator([
        { polity: 'pl', rings: [square(0, 0, 100), square(40, 40, 20)] },
      ])
      expect([locate([50, 50]), locate([10, 10])]).toEqual([null, 'pl'])
    })

    it('answers as polityAt does on the box of a ring: its corners and the middle of its sides', () => {
      const territories = [KINGDOM]
      const locate = polityLocator(territories)
      const onBox: Point[] = [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
        [50, 0],
        [100, 50],
        [50, 100],
        [0, 50],
      ]
      expect(onBox.map((at) => locate(at))).toEqual(onBox.map((at) => polityAt(territories, at)))
    })

    it('finds nobody on an empty map', () => {
      expect(polityLocator([])([50, 50])).toBeNull()
    })
  })
})

// CARTO-511: a city on ground two polities cover is judged against each of them.
describe('politiesLocator', () => {
  describe('happy path', () => {
    it('finds every polity under the point, the one painted last first', () => {
      expect(politiesLocator([KINGDOM, DUCHY])([30, 30])).toEqual(['aq', 'fr'])
    })
  })

  describe('variants', () => {
    it('finds only the polities under the point, off the duchy the kingdom alone', () => {
      expect(politiesLocator([KINGDOM, DUCHY])([80, 80])).toEqual(['fr'])
    })

    it('stops at the limit asked, the top first', () => {
      expect(politiesLocator([KINGDOM, DUCHY])([30, 30], 1)).toEqual(['aq'])
    })
  })

  describe('managed errors', () => {
    it('finds nobody over unclaimed ground', () => {
      expect(politiesLocator([KINGDOM, DUCHY])([150, 50])).toEqual([])
    })
  })

  // L4: N/A — the same prepared rings as polityLocator, whose degenerate rings are tested above.

  describe('edge cases', () => {
    it('leaves out a polity whose hole the point is in', () => {
      const holed = { polity: 'pl', rings: [square(0, 0, 100), square(20, 20, 30)] }
      expect(politiesLocator([KINGDOM, holed])([30, 30])).toEqual(['fr'])
    })
  })
})
