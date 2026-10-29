import { describe, expect, it } from 'vitest'

import { run } from '../../lines/testing/lineFixtures'

import { buildBorderStrokes } from './borderStrokes'
import { createComposedLineLayer } from './composedLineLayer'
import { STYLE, borders, liveValues, project } from './testing/borderFixtures'

import type { ComposedStroke } from './composedLineLayer'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionBorders'

describe('composedLineLayer', () => {
  describe('happy path', () => {
    it('orders the passes: the frontier afar, fading, beside and on it; then the border afar, its edging and its core', () => {
      const strokes = buildBorderStrokes(borders(2, 2), STYLE)
      expect(strokes.map((stroke) => stroke.color)).toEqual([
        '#eeeeee',
        '#eeeeee',
        '#eeeeee',
        '#888888',
        '#eeeeee',
        '#000000',
        '#ffffff',
      ])
    })

    it('draws the edging and the core over the very same stretches', () => {
      const strokes = buildBorderStrokes(borders(3, 0), STYLE)
      const [, edging, core] = strokes
      // The whole point of a casing: one geometry, two passes. No parallel offset anywhere.
      expect(edging?.segments).toBe(core?.segments)
    })

    it('builds one renderable group holding every pass', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(2, 2), STYLE), { project })
      expect(layer.object.children).toHaveLength(7)
      layer.dispose()
    })
  })

  describe('variants', () => {
    it('drops the frontier pass when it is switched off', () => {
      const strokes = buildBorderStrokes(borders(2, 2), { ...STYLE, showFrontier: false })
      expect(strokes.map((stroke) => stroke.color)).toEqual(['#eeeeee', '#000000', '#ffffff'])
    })

    it('skips an inlay no narrower than the edge, which would cover it entirely', () => {
      const strokes = buildBorderStrokes(borders(2, 0), { ...STYLE, edgeWidth: STYLE.coreWidth })
      // What survives close up is the dark edge, beside the parchment seen from afar.
      expect(strokes.map(({ role, color }) => [role, color])).toEqual([
        ['far', STYLE.parchmentColor],
        ['edge', STYLE.edgeColor],
      ])
    })

    it('gives each pass the next render order, so the core stays above its own edging', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(2, 2), STYLE), {
        project,
        renderOrderBase: 10,
      })
      expect(layer.object.children.map((child) => child.renderOrder)).toEqual([
        10, 11, 12, 13, 14, 15, 16,
      ])
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
      expect(buildBorderStrokes(borders(1, 0), STYLE).map((s) => s.role)).toEqual([
        'far',
        'edge',
        'inlay',
      ])
      const dashedStrokes = buildBorderStrokes(borders(1, 0), STYLE, () => 'dashed')
      expect(dashedStrokes.map((s) => s.role)).toEqual(['pattern'])
      // Brown, not cream: the same ink as a plain border's edge, at every scale.
      expect(dashedStrokes[0]?.color).toBe(STYLE.edgeColor)
      // Built at the edge's weight, so it matches a plain border at continent scale.
      expect(dashedStrokes[0]?.width).toBe(STYLE.edgeWidth)
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
      // Three pairs, all solid: three passes total, not nine. A century holds hundreds of pairs.
      expect(buildBorderStrokes(many, { ...STYLE, showFrontier: false })).toHaveLength(3)
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
      // Solid gets the parchment afar, edge and inlay; dashed gets a single dark stroke.
      expect(strokes.map((stroke) => stroke.role)).toEqual(['far', 'edge', 'inlay', 'pattern'])
      expect(strokes.map((stroke) => stroke.dashed === true)).toEqual([false, false, false, true])
    })

    it('carries each pass its own colour, width and opacity', () => {
      const strokes = buildBorderStrokes(borders(1, 1), STYLE)
      expect(strokes.map(({ width, opacity }) => [width, opacity])).toEqual([
        [0.8, 0.45],
        [1.2, 0.45],
        [1.2, 0.9],
        [1, 0.45],
        [2, 0.9],
        [3.2, 0.9],
        [1.4, 0.9],
      ])
    })
  })

  describe('managed errors', () => {
    it('returns no pass at all for borders with nothing in them', () => {
      expect(buildBorderStrokes(borders(0, 0), STYLE)).toEqual([])
    })

    it('still draws the frontier when no two polities touch', () => {
      const strokes = buildBorderStrokes(borders(0, 2), STYLE)
      expect(strokes.map(({ role }) => role)).toEqual(['far', 'side', 'side', 'frontier'])
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
      // Four passes in, but the empty one builds nothing: the parchment, the edging and the core remain.
      expect(layer.object.children).toHaveLength(3)
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
        STYLE.frontierFarWidth * 0.5,
        STYLE.frontierSideWidth * 0.5,
        STYLE.frontierSideWidth * 0.5,
        STYLE.frontierWidth * 0.5,
        STYLE.farWidth * 0.5,
        STYLE.edgeWidth * 0.5,
        STYLE.coreWidth * 0.5,
      ])
      layer.dispose()
    })

    it('gives a patterned pass its own relationship to the camera', () => {
      // A plain border grows with the zoom; a patterned one has to hold its weight at continent scale
      // and thin out close up, or the dashes read as blocks.
      const layer = createComposedLineLayer(
        buildBorderStrokes(borders(1, 0), STYLE, () => 'dashed'),
        { project }
      )
      layer.setWidthScale(1, 0.5)
      expect(liveValues(layer, 'linewidth')).toEqual([STYLE.edgeWidth * 0.5])
      layer.dispose()
    })

    it('gives a pass with its own dots its own dash and gap, the others the layer’s', () => {
      const dotted: ComposedStroke = {
        segments: [[run(0.1)[0], run(0.1)[1]]] as ComposedStroke['segments'],
        color: '#eeeeee',
        width: 1,
        opacity: 1,
        dashed: true,
        dashSize: 1.5,
        gapSize: 2.5,
        role: 'vassal',
      }
      const { dashSize: _dash, gapSize: _gap, ...plain } = dotted
      const layer = createComposedLineLayer([dotted, plain], { project, dashSize: 7, gapSize: 9 })
      expect([liveValues(layer, 'dashSize'), liveValues(layer, 'gapSize')]).toEqual([
        [1.5, 7],
        [2.5, 9],
      ])
      layer.dispose()
    })

    it('scales the dash pattern of every pass alike', () => {
      const layer = createComposedLineLayer(
        buildBorderStrokes(borders(1, 1), STYLE, () => 'dashed'),
        { project }
      )
      layer.setDashScale(320)
      expect(liveValues(layer, 'dashScale')).toEqual([320, 320, 320, 320, 320])
      layer.dispose()
    })

    it('falls back to the shared scale when no pattern scale is given', () => {
      const layer = createComposedLineLayer(
        buildBorderStrokes(borders(1, 0), STYLE, () => 'dashed'),
        { project }
      )
      layer.setWidthScale(0.25)
      expect(liveValues(layer, 'linewidth')).toEqual([STYLE.edgeWidth * 0.25])
      layer.dispose()
    })

    it('scales from the built width each time, never compounding', () => {
      // The loop calls this every frame; reading the live value back would drift toward zero.
      const layer = createComposedLineLayer(buildBorderStrokes(borders(1, 0), STYLE), { project })
      layer.setWidthScale(0.5)
      layer.setWidthScale(0.5)
      layer.setWidthScale(1)
      expect(liveValues(layer, 'linewidth')).toEqual([
        STYLE.farWidth,
        STYLE.edgeWidth,
        STYLE.coreWidth,
      ])
      layer.dispose()
    })

    // The dev, 2026-10-29: from afar, the borders and the frontier « couleur parchemin ».
    it('shows the parchment alone from afar, every close-up pass gone', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(1, 1), STYLE), { project })
      layer.setCloseness(0)
      expect(liveValues(layer, 'opacity')).toEqual([
        STYLE.frontierOpacity,
        0,
        0,
        0,
        STYLE.opacity,
        0,
        0,
      ])
      layer.dispose()
    })

    it('eases the whole line back without touching the relative weights', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(1, 1), STYLE), { project })
      layer.setOpacityScale(0.5)
      // Close up, as built: the parchment seen from afar is gone.
      expect(liveValues(layer, 'opacity')).toEqual([
        0,
        STYLE.opacity * STYLE.frontierFadeShare * 0.5,
        STYLE.opacity * 0.5,
        STYLE.frontierOpacity * 0.5,
        0,
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
      layer.setCloseness(0.5)
      // Half-way: the parchment afar and every close-up stroke, each at half of the eased line.
      expect(liveValues(layer, 'opacity')).toEqual([
        STYLE.frontierOpacity * 0.25,
        STYLE.opacity * STYLE.frontierFadeShare * 0.25,
        STYLE.opacity * 0.25,
        STYLE.frontierOpacity * 0.25,
      ])
      layer.dispose()
    })

    it('restores the close-up passes when the closeness returns to one', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(1, 0), STYLE), { project })
      layer.setCloseness(0)
      layer.setCloseness(1)
      expect(liveValues(layer, 'opacity')).toEqual([0, STYLE.opacity, STYLE.opacity])
      layer.dispose()
    })

    // Guard against a fade reaching the inlay alone: a level of homage arrives as a whole line.
    it('fades every pass — frontier, edge and inlay alike — when the whole line fades', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(1, 1), STYLE), { project })
      layer.setFade(0.25)
      expect(liveValues(layer, 'opacity')).toEqual([
        0,
        STYLE.opacity * STYLE.frontierFadeShare * 0.25,
        STYLE.opacity * 0.25,
        STYLE.frontierOpacity * 0.25,
        0,
        STYLE.opacity * 0.25,
        STYLE.opacity * 0.25,
      ])
      expect(layer.object.visible).toBe(true)
      layer.dispose()
    })

    it('composes the fade with the zoom-out ease and the closeness, in whichever order they come', () => {
      const one = createComposedLineLayer(buildBorderStrokes(borders(1, 0), STYLE), { project })
      one.setFade(0.5)
      one.setOpacityScale(0.5)
      one.setCloseness(0.5)
      const other = createComposedLineLayer(buildBorderStrokes(borders(1, 0), STYLE), { project })
      other.setCloseness(0.5)
      other.setOpacityScale(0.5)
      other.setFade(0.5)
      const expected = [STYLE.opacity * 0.125, STYLE.opacity * 0.125, STYLE.opacity * 0.125]
      expect(liveValues(one, 'opacity')).toEqual(expected)
      expect(liveValues(other, 'opacity')).toEqual(expected)
      one.dispose()
      other.dispose()
    })

    it('hides the line once faded out, and shows it again when it returns', () => {
      const layer = createComposedLineLayer(buildBorderStrokes(borders(1, 0), STYLE), { project })
      layer.setFade(0)
      expect(layer.object.visible).toBe(false)
      layer.setFade(1)
      expect(layer.object.visible).toBe(true)
      expect(liveValues(layer, 'opacity')).toEqual([0, STYLE.opacity, STYLE.opacity])
      layer.dispose()
    })
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
