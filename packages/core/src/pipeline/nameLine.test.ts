import { describe, expect, it } from 'vitest'

import { STEEPEST_DESCENT, readingFrame, sampled } from './nameLine'

/**
 * Points along a straight walk.
 * @param angle - its direction, radians from `+x` towards `+y` (down the page)
 * @param count - how many points
 * @returns the walk, one unit a step, about the origin
 */
function walk(angle: number, count = 21): (readonly [number, number])[] {
  return Array.from({ length: count }, (_, at): readonly [number, number] => {
    const s = at - (count - 1) / 2
    return [s * Math.cos(angle), s * Math.sin(angle)]
  })
}

/**
 * A frame's reading direction, in radians.
 * @param along - its unit vector
 * @returns the angle, from `+x` towards `+y`
 */
const angleOf = (along: readonly [number, number]): number => Math.atan2(along[1], along[0])

describe('readingFrame', () => {
  describe('happy path', () => {
    it('reads a gently falling walk left to right, along it', () => {
      expect(angleOf(readingFrame(walk(0.3)).along)).toBeCloseTo(0.3, 9)
    })
  })

  describe('variants', () => {
    it('reads a walk steeper than the steepest descent from the bottom up', () => {
      const steep = STEEPEST_DESCENT + 0.05
      expect(angleOf(readingFrame(walk(steep)).along)).toBeCloseTo(steep - Math.PI, 9)
    })

    // A compact realm's axis, held to a diagonal (`nameConstruction`, 29/10).
    it('holds a standing walk to the slant it is given, on its own side', () => {
      const frame = readingFrame(walk(1.3), Math.PI / 4)
      expect(angleOf(frame.along)).toBeCloseTo(Math.PI / 4, 9)
    })

    it('leaves a walk within the slant it is given as it is', () => {
      expect(angleOf(readingFrame(walk(-0.5), Math.PI / 4).along)).toBeCloseTo(-0.5, 9)
    })

    it('sets the letters’ up a quarter turn towards the top of the page', () => {
      const { along, up } = readingFrame(walk(0))
      expect([along[0] * up[0] + along[1] * up[1], up[1]]).toEqual([0, -1])
    })
  })

  // L3, L4: N/A — pure arithmetic over the points it is given.

  describe('edge cases', () => {
    it('centres the frame on the walk’s mean point', () => {
      const shifted = walk(0).map(([x, y]): readonly [number, number] => [x + 7, y + 3])
      const [x, y] = readingFrame(shifted).origin
      expect([x, y]).toEqual([expect.closeTo(7, 9), expect.closeTo(3, 9)])
    })
  })
})

describe('sampled', () => {
  it('walks a curve in steps of half a cell at most, with the length walked to each point', () => {
    const line = sampled((s) => [s, 0], 0, 3)
    expect([line.points.length, line.lengths.at(-1)]).toEqual([7, 3])
  })

  it('gives a line of no length two points, so it always has a direction', () => {
    expect(sampled((s) => [s, 0], 2, 2).points).toHaveLength(2)
  })
})
