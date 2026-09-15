import { LineSegments } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createLineLayer } from './lineLayer'

import type { UvSegment } from './lineLayer'

/** Identity-ish projection: normalized (u, v) → world [u, 0, v]. */
const project = (u: number, v: number): [number, number, number] => [u, 0, v]

const ONE_SEGMENT: UvSegment[] = [
  [
    { u: 0, v: 0 },
    { u: 1, v: 1 },
  ],
]

describe('createLineLayer', () => {
  describe('happy path', () => {
    it('builds a LineSegments with two projected vertices per segment', () => {
      const layer = createLineLayer(ONE_SEGMENT, { project, color: '#6b4a2b' })
      expect(layer.object).toBeInstanceOf(LineSegments)
      const pos = layer.object.geometry.getAttribute('position')
      expect(pos.count).toBe(2)
      expect([pos.getX(0), pos.getY(0), pos.getZ(0)]).toEqual([0, 0, 0])
      expect([pos.getX(1), pos.getY(1), pos.getZ(1)]).toEqual([1, 0, 1])
    })

    it('is transparent with depthWrite off so overlaid strokes blend', () => {
      const layer = createLineLayer(ONE_SEGMENT, { project, color: '#6b4a2b', opacity: 0.3 })
      expect(layer.object.material.transparent).toBe(true)
      expect(layer.object.material.opacity).toBe(0.3)
      expect(layer.object.material.depthWrite).toBe(false)
    })
  })

  describe('variants', () => {
    it('projects many segments (vertex count = 2 × segments)', () => {
      const segs: UvSegment[] = Array.from({ length: 5 }, (_, i) => [
        { u: i / 5, v: 0 },
        { u: i / 5, v: 1 },
      ])
      const layer = createLineLayer(segs, { project, color: '#000' })
      expect(layer.object.geometry.getAttribute('position').count).toBe(10)
    })

    it('multiplies the vertex count by the stroke count (overdraw)', () => {
      const layer = createLineLayer(ONE_SEGMENT, { project, color: '#000', strokes: 3 })
      expect(layer.object.geometry.getAttribute('position').count).toBe(2 * 3)
    })

    it('offsets endpoints from the crisp projection when jitter > 0 (keeping the lift y)', () => {
      const layer = createLineLayer(ONE_SEGMENT, { project, color: '#000', jitter: 0.02 })
      const pos = layer.object.geometry.getAttribute('position')
      expect(pos.getX(0)).not.toBe(0)
      expect(pos.getZ(0)).not.toBe(0)
      expect(pos.getY(0)).toBe(0)
    })

    it('welds a point shared by two segments to the same jittered position within a pass', () => {
      const shared = { u: 0.5, v: 0.5 }
      const segs: UvSegment[] = [
        [{ u: 0, v: 0 }, shared],
        [shared, { u: 1, v: 1 }],
      ]
      const pos = createLineLayer(segs, {
        project,
        color: '#000',
        jitter: 0.03,
      }).object.geometry.getAttribute('position')
      expect([pos.getX(1), pos.getZ(1)]).toEqual([pos.getX(2), pos.getZ(2)])
    })
  })

  describe('managed errors', () => {
    it('builds an empty geometry for no segments', () => {
      const layer = createLineLayer([], { project, color: '#000' })
      expect(layer.object.geometry.getAttribute('position').count).toBe(0)
    })
  })

  // L4 (unmanaged errors): N/A — pure synchronous geometry build; the segment type guarantees endpoints.

  describe('edge cases', () => {
    it('frees geometry and material on dispose (no GPU leak)', () => {
      const layer = createLineLayer(ONE_SEGMENT, { project, color: '#000' })
      const geomSpy = vi.spyOn(layer.object.geometry, 'dispose')
      const matSpy = vi.spyOn(layer.object.material, 'dispose')
      layer.dispose()
      expect(geomSpy).toHaveBeenCalledOnce()
      expect(matSpy).toHaveBeenCalledOnce()
    })
  })
})
