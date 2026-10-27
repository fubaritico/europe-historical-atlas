/**
 * Several passes of line drawn as one layer — the political line work's frontier, edging, inlay and patterns — with
 * the live setters that thin, fade and dash them as the camera moves, nothing rebuilt.
 */

import { Group } from 'three'

import { FADE_HIDDEN } from '../../fadeHidden'
import { createLineLayer } from '../../lines/lineLayer'

import type { LineLayerOptions, UvSegment } from '../../lines/lineLayer'
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
  /** Break this pass into dashes. */
  dashed?: boolean
  /**
   * What this pass is for.
   *
   * `edge` is the dark stroke that carries a plain border at every scale; `inlay` is the light stroke
   * laid inside it, which a caller fades out as the camera pulls back — at small scale a light core
   * inside a dark edging stops reading as one line and starts reading as an alternation. `pattern` is a
   * border whose meaning is in its shape (a union, a contested limit), drawn as a single dark stroke so
   * the shape stays legible.
   */
  role: 'edge' | 'inlay' | 'pattern' | 'frontier'
}

/**
 * Options for building a composed line layer.
 */
export interface ComposedLineLayerOptions extends Omit<
  LineLayerOptions,
  'color' | 'width' | 'opacity' | 'renderOrder' | 'dashed'
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
   * Rescale every pass's width by a factor of the width it was built with.
   *
   * Live, because `linewidth` is a shader uniform — which is what lets the line thin out as the camera
   * pulls back without a single geometry rebuild. Relative weights are preserved, so a casing stays
   * proportionally wider than its core at every scale.
   * A patterned pass takes its own multiplier, because it does not want the same relationship to the
   * camera as a plain line: it has to hold its weight at continent scale and thin out close up.
   * @param scale - multiplier on each pass's built width
   * @param patternScale - multiplier for the patterned passes; defaults to `scale`
   * @returns nothing
   */
  setWidthScale(scale: number, patternScale?: number): void
  /**
   * Scale the opacity of the light inlay passes alone, leaving edges, patterns and frontiers as built.
   *
   * Fading it to nothing leaves a plain dark line — which is what a border should be at continent scale,
   * and what separates best from the lighter fills. Nothing is rebuilt.
   * @param scale - multiplier on the inlay passes' built opacity, 0 hiding them entirely
   * @returns nothing
   */
  setInlayOpacity(scale: number): void
  /**
   * Rescale every pass's opacity by a factor of the opacity it was built with.
   *
   * Composes with {@link setInlayOpacity}, which is applied on top for the inlay passes alone — so a
   * caller can ease the whole line back at continent scale *and* drop the inlay entirely.
   * @param scale - multiplier on each pass's built opacity
   * @returns nothing
   */
  setOpacityScale(scale: number): void
  /**
   * Fade the whole line — every pass, edge, inlay, pattern and frontier alike — on top of the other two
   * opacity scales, and hide it once it is gone. What reveals a level of homage (ATLAS-253): a border
   * between a vassal and its suzerain fades in as a whole, not as a light core inside a missing edging.
   * @param scale - multiplier in `[0, 1]`; at or near 0 the layer is not drawn at all
   * @returns nothing
   */
  setFade(scale: number): void
  /**
   * Scale every pass's dash pattern — screen pixels per world unit, to read the dash sizes as pixels.
   * @param scale - the factor
   * @returns nothing
   */
  setDashScale(scale: number): void
  /**
   * Free the GPU resources of every pass.
   * @returns nothing
   */
  dispose(): void
}

/**
 * The three opacity scales of a composed layer, remembered so each composes with the others rather than
 * replacing them: they are set from different places in the same frame and must not fight. Every pass is
 * rescaled from its *built* opacity, never from what the previous frame left.
 * @param layers - the passes, each beside the stroke it was built from
 * @returns a setter for one scale, which reapplies all three
 */
function opacityScales(
  layers: readonly { layer: { setOpacity: (opacity: number) => void }; stroke: ComposedStroke }[]
): { set: (which: 'whole' | 'inlay' | 'fade', scale: number) => void } {
  // Each scale starts at 1: every pass as it was built.
  const scales = { whole: 1, inlay: 1, fade: 1 }
  return {
    set(which, scale): void {
      scales[which] = scale
      // Reapply all three to each pass from its built opacity; the inlay scale reaches inlays only.
      for (const { layer, stroke } of layers)
        layer.setOpacity(
          stroke.opacity * scales.whole * scales.fade * (stroke.role === 'inlay' ? scales.inlay : 1)
        )
    },
  }
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
  // One line layer per pass that has stretches, in one group, each drawn after the one before.
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
        dashed: stroke.dashed ?? false,
      })
      group.add(layer.object)
      // The stroke is kept beside its layer so the live setters can scale from the *built* value rather
      // than compounding on whatever the previous frame left behind.
      return { layer, stroke }
    })

  // The opacity setters share one set of scales, so each composes with the others.
  const opacity = opacityScales(layers)

  // The handle: every setter applies to each pass in turn.
  return {
    object: group,
    setResolution(viewportWidth: number, viewportHeight: number): void {
      for (const { layer } of layers) layer.setResolution(viewportWidth, viewportHeight)
    },
    setWidthScale(scale: number, patternScale?: number): void {
      for (const { layer, stroke } of layers)
        layer.setWidth(stroke.width * (stroke.role === 'pattern' ? (patternScale ?? scale) : scale))
    },
    setInlayOpacity(scale: number): void {
      opacity.set('inlay', scale)
    },
    setDashScale(scale: number): void {
      for (const { layer } of layers) layer.setDashScale(scale)
    },
    setOpacityScale(scale: number): void {
      opacity.set('whole', scale)
    },
    setFade(scale: number): void {
      group.visible = scale > FADE_HIDDEN
      opacity.set('fade', scale)
    },
    dispose(): void {
      for (const { layer } of layers) {
        group.remove(layer.object)
        layer.dispose()
      }
    },
  }
}
