import { describe, expect, it } from 'vitest'

import { signedDoubleArea, withoutStrayLoops } from './strayLoops'

/** Positions by index: a 2 × 2 square 0–3 counter-clockwise, then points around it. */
const AT: Record<number, readonly [number, number]> = {
  0: [0, 0],
  1: [2, 0],
  2: [2, 2],
  3: [0, 2],
  4: [3, 1],
  5: [1, 1],
  6: [1, 3],
}

/** Where an index lies in the fixture. */
function at(index: number): readonly [number, number] {
  const position = AT[index]
  if (position === undefined) throw new Error(`no position ${String(index)}`)
  return position
}

describe('strayLoops', () => {
  describe('happy path', () => {
    it('cuts a stretch walked out and back', () => {
      // 1 → 4 → 1 encloses nothing: the run went out along a coast and came back.
      expect(withoutStrayLoops([0, 1, 4, 1, 2, 3], at, 1)).toEqual([0, 1, 2, 3])
    })

    it('measures a counter-clockwise square as positive', () => {
      expect(signedDoubleArea([0, 1, 2, 3], at)).toBe(8)
      expect(signedDoubleArea([3, 2, 1, 0], at)).toBe(-8)
    })
  })

  describe('variants', () => {
    it('cuts a loop that winds against the ring', () => {
      // 2 → 6 → 3 → 2 runs clockwise above the square's top edge: land the ring does not hold.
      expect(withoutStrayLoops([0, 1, 2, 3, 6, 2, 3], at, 1)).toEqual([0, 1, 2, 3])
    })

    it('keeps a pinch that winds with the ring', () => {
      // Two counter-clockwise lobes meeting at 2: drawn on purpose, both kept.
      const lobes: Record<number, readonly [number, number]> = {
        ...AT,
        4: [4, 2],
        6: [4, 4],
      }
      const atLobe = (index: number) => lobes[index] ?? [Number.NaN, Number.NaN]
      const pinched = [0, 1, 2, 4, 6, 2, 3]
      expect(withoutStrayLoops(pinched, atLobe, 1)).toEqual(pinched)
    })

    it('cuts a loop through the start of the list, keeping the land inside', () => {
      // The list starts on 0 and visits 1 twice: the loop 1 → 0 → 1 round the wrap encloses nothing.
      expect(withoutStrayLoops([0, 1, 2, 3, 1], at, 1)).toEqual([1, 2, 3])
    })
  })

  // L3: N/A — nothing is refused here; the retrace says when too few anchors are left.
  describe('managed errors', () => {
    it('leaves a ring with no repeated anchor as it is', () => {
      expect(withoutStrayLoops([0, 1, 2, 3], at, 1)).toEqual([0, 1, 2, 3])
    })
  })

  describe('unmanaged errors', () => {
    it('lets a missing position throw, never reading it as the origin', () => {
      expect(() => withoutStrayLoops([0, 9, 0], at, 1)).toThrow('no position 9')
    })
  })

  describe('edge cases', () => {
    it('cuts an anchor met twice in a row to one visit', () => {
      expect(withoutStrayLoops([0, 1, 1, 2, 3], at, 1)).toEqual([0, 1, 2, 3])
    })

    // A ring with no area before the retrace has no winding to keep: every loop of it is stray, and the retrace
    // then refuses a ring left too short — loud, never a guessed winding.
    it('cuts every loop of a ring whose sense is zero', () => {
      expect(withoutStrayLoops([0, 1, 2, 1], at, 0).length).toBeLessThan(3)
    })

    it('cuts a whole ring that encloses nothing down to its last loop', () => {
      expect(withoutStrayLoops([0, 1, 0, 1], at, 1).length).toBeLessThan(3)
    })
  })
})
