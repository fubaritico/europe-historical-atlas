import { describe, expect, it } from 'vitest'

import { COVER_TARGET, DEFAULT_NAME_WEIGHTS, scoreName, slantOf } from './nameChoice'

import type { NameFeatures } from './nameChoice'

/** A candidate as good as can be: the largest, on the centre, covering its target, straight, level, inside. */
const IDEAL: NameFeatures = {
  size: 10,
  offCentre: 0,
  cover: COVER_TARGET,
  bend: 0,
  slant: 0,
  touchesBorder: false,
  twoLines: false,
}

describe('scoreName', () => {
  describe('happy path', () => {
    it('scores the ideal candidate at the size’s whole weight', () => {
      expect(scoreName(IDEAL, 10, DEFAULT_NAME_WEIGHTS)).toBe(DEFAULT_NAME_WEIGHTS.size)
    })
  })

  describe('variants', () => {
    it.each([
      ['a smaller size', { size: 5 }],
      ['a name off the centre', { offCentre: 0.5 }],
      ['a coverage away from its target', { cover: 0.2 }],
      ['a bend', { bend: 1 }],
      ['a slant', { slant: 1 }],
      ['a border touched', { touchesBorder: true }],
      ['two lines', { twoLines: true }],
    ])('scores %s below the ideal', (_, changed) => {
      const ideal = scoreName(IDEAL, 10, DEFAULT_NAME_WEIGHTS)
      expect(scoreName({ ...IDEAL, ...changed }, 10, DEFAULT_NAME_WEIGHTS)).toBeLessThan(ideal)
    })

    it('ignores a criterion that weighs nothing', () => {
      const weights = { ...DEFAULT_NAME_WEIGHTS, border: 0 }
      expect(scoreName({ ...IDEAL, touchesBorder: true }, 10, weights)).toBe(
        scoreName(IDEAL, 10, weights)
      )
    })
  })

  // L3, L4: N/A — arithmetic on numbers it is given.

  describe('edge cases', () => {
    it('counts a name further off than its reach as off by the reach, no more', () => {
      expect(scoreName({ ...IDEAL, offCentre: 5 }, 10, DEFAULT_NAME_WEIGHTS)).toBe(
        scoreName({ ...IDEAL, offCentre: 1 }, 10, DEFAULT_NAME_WEIGHTS)
      )
    })

    it('rewards no size when no candidate has any', () => {
      expect(scoreName({ ...IDEAL, size: 0 }, 0, DEFAULT_NAME_WEIGHTS)).toBe(0)
    })
  })
})

describe('slantOf', () => {
  it('reads a level line as no slant, a standing one as a whole slant, either way round', () => {
    expect([slantOf(0), slantOf(Math.PI / 2), slantOf(-Math.PI / 2), slantOf(Math.PI)]).toEqual([
      0, 1, 1, 0,
    ])
  })

  it('reads a diagonal as half a slant', () => {
    expect(slantOf(Math.PI / 4)).toBeCloseTo(0.5, 9)
  })
})
