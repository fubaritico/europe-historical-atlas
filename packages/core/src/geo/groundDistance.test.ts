import { describe, expect, it } from 'vitest'

import { footOnSegment, groundKm, kmPerDegreeOfLongitude } from './groundDistance'

describe('groundDistance', () => {
  describe('happy path', () => {
    it('measures a degree of latitude as about 111.3 km', () => {
      expect(groundKm([10, 45], [10, 46])).toBeCloseTo(111.32, 1)
    })

    it('finds the foot of a point on the middle of a segment', () => {
      const foot = footOnSegment([0.5, 0.01], [0, 0], [1, 0])

      expect(foot.at).toEqual([0.5, 0])
      expect(foot.along).toBeCloseTo(0.5)
      expect(foot.km).toBeCloseTo(1.113, 2)
    })
  })

  describe('variants', () => {
    it('shrinks a degree of longitude with the latitude, to half at 60°', () => {
      expect(kmPerDegreeOfLongitude(60)).toBeCloseTo(kmPerDegreeOfLongitude(0) / 2, 6)
    })

    it('measures a degree of longitude at 60° as half the one at the equator', () => {
      expect(groundKm([0, 60], [1, 60])).toBeCloseTo(groundKm([0, 0], [1, 0]) / 2, 2)
    })

    it('takes the segment’s nearer end when the point lies beyond it', () => {
      const foot = footOnSegment([2, 0], [0, 0], [1, 0])

      expect(foot.at).toEqual([1, 0])
      expect(foot.along).toBe(1)
    })
  })

  // L3, L4: N/A — pure arithmetic on numbers, no input it refuses and nothing that can fail.

  describe('edge cases', () => {
    it('measures no distance between a point and itself', () => {
      expect(groundKm([3, 40], [3, 40])).toBe(0)
    })

    it('answers the start of a segment of no length', () => {
      const foot = footOnSegment([1, 1], [0, 0], [0, 0])

      expect(foot.at).toEqual([0, 0])
      expect(foot.along).toBe(0)
    })
  })
})
