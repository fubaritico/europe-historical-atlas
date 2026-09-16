import { Group } from 'three'

import { createLineLayer } from './lineLayer'

import type { LineLayerOptions, UvSegment } from './lineLayer'
import type { RegionBorders } from '../data/regionRaster'
import type { Object3D } from 'three'

/**
 * One pass of a composed line: a set of stretches drawn in a single colour and weight.
 */
export interface ComposedStroke {
  /** The stretches this pass draws. */
  segments: readonly UvSegment[]
  /** Stroke colour (hex string). */
  color: string
  /** Stroke width in CSS pixels. */
  width: number
  /** Stroke opacity in `[0, 1]`. */
  opacity: number
}

/**
 * How the political line work is dressed. Declared structurally rather than as the dev-panel's parameter
 * type, so this module stays inside the `scene` layer and can be exercised with a literal.
 */
export interface BorderStrokeStyle {
  /** Colour of the narrow core stroke. */
  coreColor: string
  /** Width of the core stroke, in CSS pixels. */
  coreWidth: number
  /** Colour of the wider stroke drawn beneath the core, which shows as an edging either side of it. */
  edgeColor: string
  /** Width of that under-stroke. At or below {@link coreWidth} it would be invisible, so it is skipped. */
  edgeWidth: number
  /** Opacity shared by the core and its edging. */
  opacity: number
  /** Whether to draw the frontier against land nobody claims. */
  showFrontier: boolean
  /** Colour of the frontier stroke. */
  frontierColor: string
  /** Width of the frontier stroke, in CSS pixels. */
  frontierWidth: number
  /** Opacity of the frontier stroke — usually below the borders', being a limit rather than a treaty. */
  frontierOpacity: number
}

/**
 * Options for building a composed line layer.
 */
export interface ComposedLineLayerOptions extends Omit<
  LineLayerOptions,
  'color' | 'width' | 'opacity' | 'renderOrder'
> {
  /**
   * Draw order of the first stroke; each later one takes the next value. It is what keeps a core above
   * its own edging once `depthTest` is off and depth no longer arbitrates between them.
   */
  renderOrderBase?: number
}

/**
 * A composed line plus its teardown — one handle covering every pass, so callers keep the same shape as
 * a plain layer instead of growing a list to iterate on resize, on teardown and on every frame.
 */
export interface ComposedLineLayer {
  /** The renderable group to add to the scene. Scaling it scales every pass at once. */
  readonly object: Object3D
  /**
   * Update the viewport size on every pass. Fat lines size themselves in screen pixels, so this must be
   * called on each resize or the strokes keep the width of the previous viewport.
   * @param viewportWidth - the viewport width in pixels
   * @param viewportHeight - the viewport height in pixels
   * @returns nothing
   */
  setResolution(viewportWidth: number, viewportHeight: number): void
  /**
   * Free the GPU resources of every pass.
   * @returns nothing
   */
  dispose(): void
}

/**
 * Choose the passes that dress a set of derived borders.
 *
 * Pure, and separated from the drawing precisely so it can be exercised without a renderer: the ordering
 * *is* the technique. The widest stroke goes down first and each later one lands on top, so the wide
 * under-stroke survives only as an edging either side of the narrow core — which is how a composed
 * border is obtained without any parallel-offset geometry at all.
 * @param borders - the derived stretches, by kind
 * @param style - how to dress them
 * @returns the passes, in draw order
 */
export function buildBorderStrokes(
  borders: RegionBorders,
  style: BorderStrokeStyle
): ComposedStroke[] {
  const strokes: ComposedStroke[] = []
  // The frontier goes down first so a negotiated border always wins where the two meet.
  if (style.showFrontier && borders.frontier.length > 0)
    strokes.push({
      segments: borders.frontier,
      color: style.frontierColor,
      width: style.frontierWidth,
      opacity: style.frontierOpacity,
    })
  if (borders.between.length === 0) return strokes
  // An edging no wider than the core would be hidden by it entirely — skip the pass rather than pay for
  // an invisible one.
  if (style.edgeWidth > style.coreWidth)
    strokes.push({
      segments: borders.between,
      color: style.edgeColor,
      width: style.edgeWidth,
      opacity: style.opacity,
    })
  strokes.push({
    segments: borders.between,
    color: style.coreColor,
    width: style.coreWidth,
    opacity: style.opacity,
  })
  return strokes
}

/**
 * Draw several passes as one layer.
 * @param strokes - the passes, in draw order (widest first)
 * @param options - projection and depth behaviour, shared by every pass
 * @returns the composed layer handle
 */
export function createComposedLineLayer(
  strokes: readonly ComposedStroke[],
  options: ComposedLineLayerOptions
): ComposedLineLayer {
  const group = new Group()
  const layers = strokes
    .filter((stroke) => stroke.segments.length > 0)
    .map((stroke, index) => {
      const layer = createLineLayer(stroke.segments, {
        ...options,
        color: stroke.color,
        width: stroke.width,
        opacity: stroke.opacity,
        renderOrder: (options.renderOrderBase ?? 0) + index,
      })
      group.add(layer.object)
      return layer
    })

  return {
    object: group,
    setResolution(viewportWidth: number, viewportHeight: number): void {
      for (const layer of layers) layer.setResolution(viewportWidth, viewportHeight)
    },
    dispose(): void {
      for (const layer of layers) {
        group.remove(layer.object)
        layer.dispose()
      }
    },
  }
}
