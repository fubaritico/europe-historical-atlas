import { describe, expect, it } from 'vitest'

import { LETTER_REACH, coveredByNames } from './nameCover'

import type { YearNames } from '@europe-historical-atlas/core/pipeline/yearNames'

/**
 * A year of one name on its first level, its letters along a row of a 100 × 100 grid.
 * @param size - the name's size, in cells
 * @param angle - the line's direction
 * @param columns - each letter's column, on row 53
 * @returns the names
 */
function names(size = 10, angle = 0, columns = [40, 50, 60]): YearNames {
  return {
    levels: [
      {
        placed: [
          {
            polity: 'k',
            text: 'Kingdom',
            form: 'short',
            piece: 0,
            size,
            glyphs: columns.map((x) => ({ x, y: 53, angle })),
          },
        ],
        tooSmall: [],
      },
    ],
    gridWidth: 100,
    gridHeight: 100,
    unnamed: [],
  } as unknown as YearNames
}

describe('coveredByNames', () => {
  describe('happy path', () => {
    it('tells a point on the letters from one clear of them', () => {
      expect(
        coveredByNames(
          [
            { u: 0.5, v: 0.5 },
            { u: 0.1, v: 0.1 },
          ],
          names()
        )
      ).toEqual([true, false])
    })
  })

  describe('variants', () => {
    it('measures the letters from their middle, above their baseline', () => {
      // Just below the baseline, beyond the reach from the letters' middle.
      const below = 0.53 + (10 * LETTER_REACH) / 100
      expect(coveredByNames([{ u: 0.5, v: below }], names())).toEqual([false])
    })

    it('turns the letters’ middle with their line', () => {
      // One letter on a line running down (a quarter turn): its up is toward +x, so its middle stands at x + 3.5 —
      // 53.5. A point at 42.5 is 11 from it, out of reach; it would be 4 from a middle turned the wrong way (46.5).
      const down = names(10, Math.PI / 2, [50])
      const middle = { u: 53.5 / 99, v: 53 / 99 }
      const wrongSide = { u: 42.5 / 99, v: 53 / 99 }
      expect(coveredByNames([middle, wrongSide], down)).toEqual([true, false])
    })

    it('reads only the first level, the one seen from afar', () => {
      const deeper = names()
      const level = deeper.levels[0]
      if (level === undefined) throw new Error('fixture')
      const twoLevels = { ...deeper, levels: [{ ...level, placed: [] }, level] } as YearNames
      expect(coveredByNames([{ u: 0.5, v: 0.5 }], twoLevels)).toEqual([false])
    })
  })

  describe('managed errors', () => {
    it('covers no point before the names are placed', () => {
      expect(coveredByNames([{ u: 0.5, v: 0.5 }], null)).toEqual([false])
    })
  })

  // L4: N/A — pure arithmetic.

  describe('edge cases', () => {
    it('answers nothing for no point', () => {
      expect(coveredByNames([], names())).toEqual([])
    })
  })
})
