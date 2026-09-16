import { describe, expect, it } from 'vitest'

import {
  buildBorderStrokes,
  createComposedLineLayer,
  inlayOpacityScale,
  offsetPolyline,
  polylinesToSegments,
} from './composedLineLayer'

import type { BorderStrokeStyle, ComposedLineLayer, ComposedStroke } from './composedLineLayer'
import type { UvPoint } from '../data/coastlineSource'
import type { RegionBorders } from '../data/regionRaster'

/** A vertical two-point run, enough to make a pass non-empty. */
function run(u: number): UvPoint[] {
  return [
    { u, v: 0 },
    { u, v: 1 },
  ]
}

/** Derived borders with whichever kinds the test needs, all under one pair. */
function borders(between: number, frontier: number): RegionBorders {
  return {
    between:
      between === 0
        ? []
        : [{ pair: [0, 1], lines: Array.from({ length: between }, (_, i) => run(i / 10)) }],
    frontier: Array.from({ length: frontier }, (_, i) => run(0.5 + i / 10)),
  }
}

const STYLE: BorderStrokeStyle = {
  coreColor: '#ffffff',
  coreWidth: 1.4,
  edgeColor: '#000000',
  edgeWidth: 3.2,
  opacity: 0.9,
  showFrontier: true,
  frontierColor: '#888888',
  frontierWidth: 1,
  frontierOpacity: 0.45,
  dashSize: 0.03,
  gapSize: 0.024,
  doubleGap: 0.002,
}

/** Project a grid coordinate onto a flat plane — the collaborator, mocked. */
const project = (u: number, v: number): [number, number, number] => [u, 0, v]

/** The live material property named on each pass — what the zoom link actually drives. */
function liveValues(layer: ComposedLineLayer, property: 'linewidth' | 'opacity'): number[] {
  return layer.object.children.map((child: object) => {
    // Fat lines carry a LineMaterial; reading it back is the only way to prove the setter reached it.
    const { material } = child as unknown as { material: Record<string, number> }
    return material[property] ?? Number.NaN
  })
}

describe('composedLineLayer', () => {
  describe('happy path', () => {
    it('orders the passes frontier, edging, core', () => {
      const strokes = buildBorderStrokes(borders(2, 2), STYLE)
      expect(strokes.map((stroke) => stroke.color)).toEqual(['#888888', '#000000', '#ffffff'])
    })

    it('draws the edging and the core over the very same stretches', () => {
      const strokes = buildBorderStrokes(borders(3, 0), STYLE)
      const [edging, core] = strokes
      // The whole point of a casing: one geometry, two passes. No parallel offset anywhere.
      expect(edging?.segments).toBe(core?.segments)
    })

    it('builds one renderable group holding every pass', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(2, 2), STYLE), { project })
      expect(layer.object.children).toHaveLength(3)
      layer.dispose()
    })
  })

  describe('variants', () => {
    it('drops the frontier pass when it is switched off', () => {
      const strokes = buildBorderStrokes(borders(2, 2), { ...STYLE, showFrontier: false })
      expect(strokes.map((stroke) => stroke.color)).toEqual(['#000000', '#ffffff'])
    })

    it('skips an inlay no narrower than the edge, which would cover it entirely', () => {
      const strokes = buildBorderStrokes(borders(2, 0), { ...STYLE, edgeWidth: STYLE.coreWidth })
      expect(strokes).toHaveLength(1)
      // What survives is the dark edge — a border is dark at every scale.
      expect(strokes[0]?.color).toBe(STYLE.edgeColor)
      expect(strokes[0]?.role).toBe('edge')
    })

    it('gives each pass the next render order, so the core stays above its own edging', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(2, 2), STYLE), {
        project,
        renderOrderBase: 10,
      })
      expect(layer.object.children.map((child) => child.renderOrder)).toEqual([10, 11, 12])
      layer.dispose()
    })

    it('dashes only the passes the style table marks as broken', () => {
      const strokes = buildBorderStrokes(borders(2, 0), STYLE, () => 'dashed')
      expect(strokes.every((stroke) => stroke.dashed === true)).toBe(true)
      expect(buildBorderStrokes(borders(2, 0), STYLE).every((s) => s.dashed !== true)).toBe(true)
    })

    it('doubles a border by drawing the run shifted either way', () => {
      const solid = buildBorderStrokes(borders(1, 0), STYLE)
      const doubled = buildBorderStrokes(borders(1, 0), STYLE, () => 'double')
      // Twice the geometry: two runs where there was one.
      expect(doubled[0]?.segments.length).toBe((solid[0]?.segments.length ?? 0) * 2)
    })

    it('draws a patterned border as one dark stroke, and a plain one as edge plus inlay', () => {
      // A patterned border says what it means through its shape; a light inlay would break the shape up.
      expect(buildBorderStrokes(borders(1, 0), STYLE).map((s) => s.role)).toEqual(['edge', 'inlay'])
      const dashedStrokes = buildBorderStrokes(borders(1, 0), STYLE, () => 'dashed')
      expect(dashedStrokes.map((s) => s.role)).toEqual(['pattern'])
      // Brown, not cream: the same ink as a plain border's edge, at every scale.
      expect(dashedStrokes[0]?.color).toBe(STYLE.edgeColor)
      // But the core's weight — a broken line reads heavier than a continuous one at the same width.
      expect(dashedStrokes[0]?.width).toBe(STYLE.coreWidth)
      expect(buildBorderStrokes(borders(1, 0), STYLE, () => 'double').map((s) => s.role)).toEqual([
        'pattern',
      ])
    })

    it('keeps one pass per pattern rather than one per pair', () => {
      const many: RegionBorders = {
        between: [
          { pair: [0, 1], lines: [run(0.1)] },
          { pair: [1, 2], lines: [run(0.2)] },
          { pair: [2, 3], lines: [run(0.3)] },
        ],
        frontier: [],
      }
      // Three pairs, all solid: two passes total, not six. A century holds hundreds of pairs.
      expect(buildBorderStrokes(many, { ...STYLE, showFrontier: false })).toHaveLength(2)
    })

    it('separates the patterns into their own passes', () => {
      const mixed: RegionBorders = {
        between: [
          { pair: [0, 1], lines: [run(0.1)] },
          { pair: [1, 2], lines: [run(0.2)] },
        ],
        frontier: [],
      }
      const strokes = buildBorderStrokes(mixed, { ...STYLE, showFrontier: false }, (pair) =>
        pair[0] === 0 ? 'solid' : 'dashed'
      )
      // Solid gets edge + inlay; dashed gets a single dark stroke.
      expect(strokes.map((stroke) => stroke.role)).toEqual(['edge', 'inlay', 'pattern'])
      expect(strokes.map((stroke) => stroke.dashed === true)).toEqual([false, false, true])
    })

    it('carries each pass its own colour, width and opacity', () => {
      const strokes = buildBorderStrokes(borders(1, 1), STYLE)
      expect(strokes[0]).toMatchObject({ width: 1, opacity: 0.45 })
      expect(strokes[1]).toMatchObject({ width: 3.2, opacity: 0.9 })
      expect(strokes[2]).toMatchObject({ width: 1.4, opacity: 0.9 })
    })
  })

  describe('managed errors', () => {
    it('returns no pass at all for borders with nothing in them', () => {
      expect(buildBorderStrokes(borders(0, 0), STYLE)).toEqual([])
    })

    it('still draws the frontier when no two polities touch', () => {
      const strokes = buildBorderStrokes(borders(0, 2), STYLE)
      expect(strokes).toHaveLength(1)
      expect(strokes[0]?.color).toBe(STYLE.frontierColor)
    })

    it('omits a pass whose stretches are empty rather than building an empty geometry', () => {
      const empty: ComposedStroke = {
        segments: [],
        color: '#ff0000',
        width: 2,
        opacity: 1,
        role: 'inlay',
      }
      const layer = createComposedLineLayer([empty, ...buildBorderStrokes(borders(1, 0), STYLE)], {
        project,
      })
      // Three passes in, but the empty one builds nothing: the edging and the core remain.
      expect(layer.object.children).toHaveLength(2)
      layer.dispose()
    })
  })

  describe('unmanaged errors', () => {
    it('survives a style whose widths are zero', () => {
      expect(() =>
        buildBorderStrokes(borders(1, 1), { ...STYLE, coreWidth: 0, edgeWidth: 0 })
      ).not.toThrow()
    })

    // L4: no async work and no external resource — nothing else can fail unexpectedly here.
  })

  describe('zoom-linked styling', () => {
    it('scales every pass from the width it was built with', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(1, 1), STYLE), { project })
      layer.setWidthScale(0.5)
      expect(liveValues(layer, 'linewidth')).toEqual([
        STYLE.frontierWidth * 0.5,
        STYLE.edgeWidth * 0.5,
        STYLE.coreWidth * 0.5,
      ])
      layer.dispose()
    })

    it('scales from the built width each time, never compounding', () => {
      // The loop calls this every frame; reading the live value back would drift toward zero.
      const layer = createComposedLineLayer(buildBorderStrokes(borders(1, 0), STYLE), { project })
      layer.setWidthScale(0.5)
      layer.setWidthScale(0.5)
      layer.setWidthScale(1)
      expect(liveValues(layer, 'linewidth')).toEqual([STYLE.edgeWidth, STYLE.coreWidth])
      layer.dispose()
    })

    it('fades the inlay alone, leaving the dark edge and the frontier as built', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(1, 1), STYLE), { project })
      layer.setInlayOpacity(0)
      // Passes are frontier, edge, inlay: only the last goes dark, so a plain brown line remains.
      expect(liveValues(layer, 'opacity')).toEqual([STYLE.frontierOpacity, STYLE.opacity, 0])
      layer.dispose()
    })

    it('eases the whole line back without touching the relative weights', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(1, 1), STYLE), { project })
      layer.setOpacityScale(0.5)
      expect(liveValues(layer, 'opacity')).toEqual([
        STYLE.frontierOpacity * 0.5,
        STYLE.opacity * 0.5,
        STYLE.opacity * 0.5,
      ])
      layer.dispose()
    })

    it('composes the two opacity scales instead of letting them fight', () => {
      // Both are applied in the same frame from different places: the whole line eases back at
      // continent scale, and the inlay drops out on top of that. If the second overwrote the first, the
      // inlay would flash back to full strength at exactly the zoom where it should be gone.
      const layer = createComposedLineLayer(buildBorderStrokes(borders(0, 1), STYLE), { project })
      layer.setOpacityScale(0.5)
      layer.setInlayOpacity(0.5)
      expect(liveValues(layer, 'opacity')).toEqual([STYLE.frontierOpacity * 0.5])
      layer.dispose()
    })

    it('restores the inlay when the scale returns to one', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(1, 0), STYLE), { project })
      layer.setInlayOpacity(0)
      layer.setInlayOpacity(1)
      expect(liveValues(layer, 'opacity')).toEqual([STYLE.opacity, STYLE.opacity])
      layer.dispose()
    })
  })

  describe('inlayOpacityScale', () => {
    it('ramps from nothing at full zoom-out to full strength at the threshold', () => {
      expect(inlayOpacityScale(0, 0.4)).toBe(0)
      expect(inlayOpacityScale(0.2, 0.4)).toBeCloseTo(0.5)
      expect(inlayOpacityScale(0.4, 0.4)).toBe(1)
    })

    it('holds at full strength beyond the threshold', () => {
      expect(inlayOpacityScale(1, 0.4)).toBe(1)
    })

    it('never fades when the threshold is zero, instead of dividing by it', () => {
      // The slider goes down to 0. `0 / 0` is NaN, and `clamp01` passes NaN straight through since both
      // its comparisons are false against it — a NaN opacity throws nothing and WebGL drops the draw, so
      // the casing would vanish silently at the default camera position.
      expect(inlayOpacityScale(0, 0)).toBe(1)
      expect(inlayOpacityScale(0.5, 0)).toBe(1)
      expect(Number.isNaN(inlayOpacityScale(0, 0))).toBe(false)
    })

    it('clamps a negative threshold rather than inverting the ramp', () => {
      expect(inlayOpacityScale(0.5, -1)).toBe(1)
    })
  })

  describe('offsetPolyline', () => {
    it('shifts a straight run sideways by exactly the distance asked', () => {
      const shifted = offsetPolyline(run(0.5), 0.01)
      // The run goes south; its left-hand normal points west, so the copy lands at u = 0.49.
      for (const point of shifted) expect(point.u).toBeCloseTo(0.49)
    })

    it('shifts the other way for a negative distance', () => {
      const shifted = offsetPolyline(run(0.5), -0.01)
      for (const point of shifted) expect(point.u).toBeCloseTo(0.51)
    })

    it('keeps a closed run closed', () => {
      const square: UvPoint[] = [
        { u: 0.4, v: 0.4 },
        { u: 0.6, v: 0.4 },
        { u: 0.6, v: 0.6 },
        { u: 0.4, v: 0.6 },
        { u: 0.4, v: 0.4 },
      ]
      const shifted = offsetPolyline(square, 0.01)
      const head = shifted[0]
      const tail = shifted[shifted.length - 1]
      expect(head).toEqual(tail)
    })

    it('clamps a hairpin instead of throwing the vertex off the map', () => {
      // Two segments doubling back on each other: the exact mitre is at infinity.
      const hairpin: UvPoint[] = [
        { u: 0.5, v: 0.4 },
        { u: 0.5, v: 0.5 },
        { u: 0.5001, v: 0.4 },
      ]
      for (const point of offsetPolyline(hairpin, 0.01)) {
        expect(Number.isFinite(point.u)).toBe(true)
        expect(Math.abs(point.u - 0.5)).toBeLessThan(0.05)
      }
    })

    it('returns the run untouched for a zero distance', () => {
      const original = run(0.5)
      expect(offsetPolyline(original, 0)).toEqual(original)
    })

    it('returns a single point untouched, having no direction to offset along', () => {
      const lone: UvPoint[] = [{ u: 0.5, v: 0.5 }]
      expect(offsetPolyline(lone, 0.01)).toEqual(lone)
    })
  })

  describe('edge cases', () => {
    it('explodes a run into one fewer segment than it has points', () => {
      expect(
        polylinesToSegments([
          [
            { u: 0, v: 0 },
            { u: 0, v: 1 },
            { u: 0, v: 2 },
          ],
        ])
      ).toHaveLength(2)
    })

    it('yields nothing for a run of a single point', () => {
      expect(polylinesToSegments([[{ u: 0, v: 0 }]])).toEqual([])
    })

    it('frees every pass on teardown', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(2, 2), STYLE), { project })
      layer.dispose()
      expect(layer.object.children).toHaveLength(0)
    })

    it('propagates the viewport to every pass without throwing', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(2, 2), STYLE), { project })
      expect(() => {
        layer.setResolution(1280, 720)
      }).not.toThrow()
      layer.dispose()
    })

    it('builds an empty group when handed no passes', () => {
      const layer = createComposedLineLayer([], { project })
      expect(layer.object.children).toHaveLength(0)
      expect(() => {
        layer.dispose()
      }).not.toThrow()
    })

    it('scales every pass at once through the group', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(2, 2), STYLE), { project })
      layer.object.scale.setY(0.5)
      // One handle, one scale: the reason the composed line is a group rather than a list of layers.
      expect(layer.object.scale.y).toBe(0.5)
      layer.dispose()
    })
  })
})
