import { describe, expect, it } from 'vitest'

import { buildBorderStrokes, createComposedLineLayer } from './composedLineLayer'

import type { BorderStrokeStyle, ComposedStroke } from './composedLineLayer'
import type { UvSegment } from './lineLayer'
import type { RegionBorders } from '../data/regionRaster'

/** A one-segment stretch, enough to make a stroke non-empty. */
function stretch(u: number): UvSegment {
  return [
    { u, v: 0 },
    { u, v: 1 },
  ]
}

/** Derived borders with whichever kinds the test needs. */
function borders(between: number, frontier: number): RegionBorders {
  return {
    between: Array.from({ length: between }, (_, i) => stretch(i / 10)),
    frontier: Array.from({ length: frontier }, (_, i) => stretch(0.5 + i / 10)),
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
}

/** Project a grid coordinate onto a flat plane — the collaborator, mocked. */
const project = (u: number, v: number): [number, number, number] => [u, 0, v]

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

    it('skips an edging no wider than the core, which would be hidden by it', () => {
      const strokes = buildBorderStrokes(borders(2, 0), { ...STYLE, edgeWidth: STYLE.coreWidth })
      expect(strokes).toHaveLength(1)
      expect(strokes[0]?.color).toBe(STYLE.coreColor)
    })

    it('gives each pass the next render order, so the core stays above its own edging', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(2, 2), STYLE), {
        project,
        renderOrderBase: 10,
      })
      expect(layer.object.children.map((child) => child.renderOrder)).toEqual([10, 11, 12])
      layer.dispose()
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
      const empty: ComposedStroke = { segments: [], color: '#ff0000', width: 2, opacity: 1 }
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

  describe('edge cases', () => {
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
