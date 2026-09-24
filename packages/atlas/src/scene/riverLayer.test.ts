import { describe, expect, it, vi } from 'vitest'

import { createRiverLayer, rankOpacity, rankRevealZoom, rankWidth } from './riverLayer'

import type { RiverLayerOptions } from './riverLayer'
import type { River } from '@europe-atlas/core/data/riverSource'

/** A flat projection — the layer under test is about grouping and reveal, not about terrain. */
const project = (u: number, v: number): [number, number, number] => [u, 0, v]

const OPTS: RiverLayerOptions = {
  project,
  color: '#3f5470',
  opacity: 0.6,
  revealStart: 0,
  revealEnd: 0.8,
  fade: 0.25,
  includeLakeCenterlines: true,
  jitter: 0,
  widthMajor: 1,
  widthMinor: 1,
}

/** Build a river with a short two-point polyline. */
function river(rank: number, kind = 'River', name: string | null = null): River {
  return {
    rank,
    kind,
    name,
    points: [
      { u: 0.1, v: 0.1 },
      { u: 0.2, v: 0.2 },
    ],
  }
}

describe('riverLayer', () => {
  describe('happy path', () => {
    it('builds one drawable layer per rank present', () => {
      const layer = createRiverLayer([river(1), river(1), river(5), river(9)], OPTS)
      expect(layer.object.children).toHaveLength(3)
      layer.dispose()
    })

    it('spreads the reveal from the majors at revealStart to the minors at revealEnd', () => {
      expect(rankRevealZoom(1, OPTS)).toBeCloseTo(OPTS.revealStart, 9)
      expect(rankRevealZoom(9, OPTS)).toBeCloseTo(OPTS.revealEnd, 9)
      expect(rankRevealZoom(5, OPTS)).toBeCloseTo(0.4, 9)
    })
  })

  describe('variants', () => {
    it('reveals a minor river only once the camera is close', () => {
      expect(rankOpacity(9, 0, OPTS)).toBe(0)
      expect(rankOpacity(9, 0.8, OPTS)).toBeCloseTo(OPTS.opacity, 9)
    })

    it('keeps the majors drawn at every zoom', () => {
      expect(rankOpacity(1, 0, OPTS)).toBeCloseTo(OPTS.opacity, 9)
      expect(rankOpacity(1, 1, OPTS)).toBeCloseTo(OPTS.opacity, 9)
    })

    it('draws a trunk thicker than a tributary', () => {
      const wide = { ...OPTS, widthMajor: 3, widthMinor: 1 }
      expect(rankWidth(1, wide)).toBeCloseTo(3, 9)
      expect(rankWidth(9, wide)).toBeCloseTo(1, 9)
      expect(rankWidth(5, wide)).toBeCloseTo(2, 9)
      expect(rankWidth(3, wide)).toBeGreaterThan(rankWidth(7, wide))
    })

    it('clamps an out-of-range rank to the ends of the width scale', () => {
      const wide = { ...OPTS, widthMajor: 3, widthMinor: 1 }
      expect(rankWidth(-4, wide)).toBeCloseTo(3, 9)
      expect(rankWidth(99, wide)).toBeCloseTo(1, 9)
    })

    it('hands the viewport down to every rank', () => {
      const layer = createRiverLayer([river(1), river(9)], {
        ...OPTS,
        widthMajor: 3,
        widthMinor: 2,
      })
      layer.setResolution(800, 600)
      for (const rank of layer.ranks.values()) {
        const resolution = (rank.object.material as { resolution: { x: number; y: number } })
          .resolution
        expect([resolution.x, resolution.y]).toEqual([800, 600])
      }
      layer.dispose()
    })

    it('reveals a lower rank before a higher one', () => {
      const zoom = 0.45
      expect(rankOpacity(3, zoom, OPTS)).toBeGreaterThan(rankOpacity(7, zoom, OPTS))
    })

    it('drops the lake centrelines when they are filtered out', () => {
      // Both rivers share a rank, so they land in one layer: the difference shows in its vertex count,
      // not in the number of layers.
      const rivers = [river(2, 'River'), river(2, 'Lake Centerline')]
      // The rivers ask for a width, so they are drawn as instanced quads: one `instanceStart` per
      // segment, where a plain line geometry would carry two `position` entries per segment.
      const segments = (includeLakeCenterlines: boolean): number => {
        const layer = createRiverLayer(rivers, { ...OPTS, includeLakeCenterlines })
        const count = layer.ranks.get(2)?.object.geometry.getAttribute('instanceStart').count ?? 0
        layer.dispose()
        return count
      }
      expect(segments(true)).toBe(2)
      expect(segments(false)).toBe(1) // the lake centreline is gone
    })

    it('recolours every rank without a rebuild', () => {
      const layer = createRiverLayer([river(1), river(9)], OPTS)
      const before = layer.object.children.map((child) => child.uuid)
      layer.setColor('#ff0000')
      expect(layer.object.children.map((child) => child.uuid)).toEqual(before)
      layer.dispose()
    })

    it('hides a rank entirely rather than drawing it at zero opacity', () => {
      const layer = createRiverLayer([river(9)], OPTS)
      layer.setZoom(0)
      expect(layer.ranks.get(9)?.object.visible).toBe(false)
      layer.setZoom(1)
      expect(layer.ranks.get(9)?.object.visible).toBe(true)
      layer.dispose()
    })
  })

  describe('managed errors', () => {
    it('clamps an out-of-range rank into the dataset 1..9 scale', () => {
      expect(rankRevealZoom(0, OPTS)).toBeCloseTo(rankRevealZoom(1, OPTS), 9)
      expect(rankRevealZoom(42, OPTS)).toBeCloseTo(rankRevealZoom(9, OPTS), 9)
    })

    it('builds nothing from an empty network', () => {
      const layer = createRiverLayer([], OPTS)
      expect(layer.object.children).toHaveLength(0)
      layer.dispose()
    })

    it('survives a zero fade span without dividing by zero', () => {
      const opacity = rankOpacity(5, 0.5, { ...OPTS, fade: 0 })
      expect(Number.isFinite(opacity)).toBe(true)
    })
  })

  // L4 (unmanaged errors): N/A — pure geometry assembly, no I/O and no async path; the fetch failures
  // this layer could face belong to `riverSource`, which owns the loading. Vitest fails on an empty
  // suite, hence a note rather than a block.

  describe('edge cases', () => {
    it('frees the GPU resources of every rank on teardown', () => {
      // Follows the lineLayer convention: three's dispose() frees the GPU resource without clearing
      // the JS attribute objects, so the call itself is what we assert.
      const layer = createRiverLayer([river(1), river(5), river(9)], OPTS)
      const spies = [...layer.ranks.values()].flatMap((rank) => [
        vi.spyOn(rank.object.geometry, 'dispose'),
        vi.spyOn(rank.object.material, 'dispose'),
      ])
      expect(spies).toHaveLength(6)
      layer.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalledOnce()
      expect(layer.object.children).toHaveLength(0)
    })

    it('ignores a single-point polyline, which spans no segment', () => {
      const stub: River = { rank: 1, kind: 'River', name: null, points: [{ u: 0.5, v: 0.5 }] }
      const layer = createRiverLayer([stub], OPTS)
      expect(layer.object.children).toHaveLength(0)
      layer.dispose()
    })

    it('stays within [0, opacity] across the whole zoom range', () => {
      for (let zoom = 0; zoom <= 1.0001; zoom += 0.1) {
        for (let rank = 1; rank <= 9; rank++) {
          const opacity = rankOpacity(rank, zoom, OPTS)
          expect(opacity).toBeGreaterThanOrEqual(0)
          expect(opacity).toBeLessThanOrEqual(OPTS.opacity)
        }
      }
    })
  })
})
