import { describe, expect, it } from 'vitest'

import { snapToFrameEdge } from './frameEdge'

const SIZE = { width: 1000, height: 800 }

describe('snapToFrameEdge', () => {
  describe('happy path', () => {
    // CARTO-257: a point within reach of the top edge lands on it, its other coordinate kept.
    it('puts a point near an edge on the edge', () => {
      expect(snapToFrameEdge([400, 3], SIZE, 5)).toEqual({ point: [400, 0], snapped: 'edge' })
    })

    it('puts a point near two edges in their corner', () => {
      expect(snapToFrameEdge([4, 2], SIZE, 5)).toEqual({ point: [0, 0], snapped: 'corner' })
    })
  })

  describe('variants', () => {
    it('reaches each of the four edges', () => {
      expect(snapToFrameEdge([2, 400], SIZE, 5).point).toEqual([0, 400])
      expect(snapToFrameEdge([997, 400], SIZE, 5).point).toEqual([1000, 400])
      expect(snapToFrameEdge([400, 3], SIZE, 5).point).toEqual([400, 0])
      expect(snapToFrameEdge([400, 798], SIZE, 5).point).toEqual([400, 800])
    })

    it('reaches each of the four corners', () => {
      expect(snapToFrameEdge([998, 797], SIZE, 5)).toEqual({
        point: [1000, 800],
        snapped: 'corner',
      })
      expect(snapToFrameEdge([1, 799], SIZE, 5)).toEqual({ point: [0, 800], snapped: 'corner' })
      expect(snapToFrameEdge([999, 1], SIZE, 5)).toEqual({ point: [1000, 0], snapped: 'corner' })
    })

    it('reaches an edge from just outside it, as the pointer can be', () => {
      expect(snapToFrameEdge([-3, 400], SIZE, 5)).toEqual({ point: [0, 400], snapped: 'edge' })
    })
  })

  describe('managed errors', () => {
    it('leaves a point out of reach of every edge where it is', () => {
      expect(snapToFrameEdge([400, 300], SIZE, 5)).toEqual({ point: [400, 300], snapped: null })
    })

    // A point far outside is not drawn back onto the map: the caller refuses it as off the map.
    it('leaves a point far outside where it is', () => {
      expect(snapToFrameEdge([-50, 400], SIZE, 5)).toEqual({ point: [-50, 400], snapped: null })
    })
  })

  // L4: N/A — arithmetic over numbers, nothing thrown.

  describe('edge cases', () => {
    it('snaps a point exactly at the reach, and not one just past it', () => {
      expect(snapToFrameEdge([400, 5], SIZE, 5).snapped).toBe('edge')
      expect(snapToFrameEdge([400, 5.01], SIZE, 5).snapped).toBeNull()
    })

    it('snaps nothing with no reach, unless the point is on the edge already', () => {
      expect(snapToFrameEdge([400, 1], SIZE, 0).snapped).toBeNull()
      expect(snapToFrameEdge([400, 0], SIZE, 0)).toEqual({ point: [400, 0], snapped: 'edge' })
    })
  })
})
