import { Group } from 'three'

import { clamp01 } from '../utils/math'

import { createLineLayer } from './lineLayer'

import type { LineLayerOptions, UvSegment } from './lineLayer'
import type { BorderPattern } from '../data/borderStyles'
import type { UvPoint } from '../data/coastlineSource'
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
 * How far a mitred corner may be pushed out, as a multiple of the offset distance.
 *
 * Offsetting a chain moves each vertex along the bisector of its two edges, and the sharper the corner
 * the further out that lands — at the limit, a hairpin sends it to infinity. Clamping trades an exact
 * offset at sharp corners, where nobody can see it, for a line that cannot spike off the map.
 */
const MAX_MITER = 4

/**
 * The perpendicular of a segment, unit length, or a zero vector when the two points coincide.
 * @param from - the segment's start
 * @param to - the segment's end
 * @returns the left-hand normal
 */
function normalOf(from: UvPoint, to: UvPoint): UvPoint {
  const du = to.u - from.u
  const dv = to.v - from.v
  const length = Math.hypot(du, dv)
  if (length < 1e-12) return { u: 0, v: 0 }
  return { u: -dv / length, v: du / length }
}

/**
 * Shift a chain of points sideways by a fixed distance — the geometry behind a doubled border.
 *
 * Each vertex moves along the bisector of its two edges, scaled so the offset line stays parallel to the
 * original through the corner (a mitre), and clamped by {@link MAX_MITER} so a hairpin cannot throw the
 * vertex across the map. Endpoints of an open chain use their single edge's normal; a closed chain is
 * offset cyclically, or its seam would show.
 * @param points - the chain
 * @param distance - how far to shift, in normalized grid units; negative shifts the other way
 * @returns the shifted chain
 */
export function offsetPolyline(points: readonly UvPoint[], distance: number): UvPoint[] {
  const head = points[0]
  const tail = points[points.length - 1]
  if (points.length < 2 || distance === 0 || !head || !tail) return [...points]
  const closed = points.length > 3 && head.u === tail.u && head.v === tail.v
  const ring = closed ? points.slice(0, -1) : points
  const count = ring.length
  const out: UvPoint[] = []
  for (let i = 0; i < count; i++) {
    const here = ring[i]
    const previous = ring[closed ? (i - 1 + count) % count : Math.max(0, i - 1)]
    const next = ring[closed ? (i + 1) % count : Math.min(count - 1, i + 1)]
    if (!here || !previous || !next) continue
    const before = normalOf(previous, here)
    const after = normalOf(here, next)
    let mu = before.u + after.u
    let mv = before.v + after.v
    const length = Math.hypot(mu, mv)
    if (length < 1e-9) {
      // An end of an open chain (one normal is zero), or a reversal: take whichever normal exists.
      const only = after.u === 0 && after.v === 0 ? before : after
      mu = only.u
      mv = only.v
    } else {
      mu /= length
      mv /= length
    }
    const reference = after.u === 0 && after.v === 0 ? before : after
    const cosine = mu * reference.u + mv * reference.v
    const scale = cosine > 1e-6 ? Math.min(MAX_MITER, 1 / cosine) : MAX_MITER
    out.push({ u: here.u + mu * distance * scale, v: here.v + mv * distance * scale })
  }
  const first = out[0]
  if (closed && first) out.push(first)
  return out
}

/**
 * Explode chains into the pairs of points a line layer draws, run by run so a dash pattern keeps flowing
 * along each one.
 * @param lines - the chains
 * @returns the stretches
 */
export function polylinesToSegments(lines: readonly (readonly UvPoint[])[]): UvSegment[] {
  const segments: UvSegment[] = []
  for (const line of lines)
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i]
      const b = line[i + 1]
      if (a && b) segments.push([a, b])
    }
  return segments
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
  /** Dash length in world units, for borders the style table marks as broken. */
  dashSize: number
  /** Gap length in world units, for those same borders. */
  gapSize: number
  /** Half the distance between the two runs of a doubled border, in normalized grid units. */
  doubleGap: number
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
   * @param scale - multiplier on each pass's built width
   * @returns nothing
   */
  setWidthScale(scale: number): void
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
   * Free the GPU resources of every pass.
   * @returns nothing
   */
  dispose(): void
}

/**
 * How strongly the light inlay shows at a given zoom.
 *
 * Ramps from nothing at full zoom-out to full strength at `fadeThreshold`. The dark edge is the constant
 * — a border is brown at every scale — and the light inlay is the refinement that appears as the camera
 * comes in. Below the threshold a plain dark line is all that remains, which is both what reads at
 * continent scale and what separates best from the lighter fills.
 *
 * The zero-threshold branch is **load-bearing, not defensive**: the dev-panel slider for this value goes
 * down to 0, and `0 / 0` is `NaN`, which `clamp01` passes straight through — both its comparisons are
 * false against `NaN`. A `NaN` opacity throws nothing and makes WebGL drop the draw, so the casing would
 * vanish silently at the default camera position.
 * @param zoom - the camera zoom, 0 at full zoom-out and 1 at full zoom-in
 * @param fadeThreshold - the zoom at which the inlay reaches full strength; 0 means never fade it
 * @returns a multiplier in `[0, 1]` for the inlay passes' opacity
 */
export function inlayOpacityScale(zoom: number, fadeThreshold: number): number {
  return fadeThreshold > 0 ? clamp01(zoom / fadeThreshold) : 1
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
  style: BorderStrokeStyle,
  patternFor: (pair: readonly [number, number]) => BorderPattern = () => 'solid'
): ComposedStroke[] {
  // Gathered by pattern rather than by pair: a century can hold hundreds of pairs, and one draw call per
  // pair would trade a rendering problem for a worse one. Three patterns means at most six passes.
  const byPattern = new Map<BorderPattern, UvSegment[]>()
  for (const group of borders.between) {
    const pattern = patternFor(group.pair)
    // A doubled border is the one pattern that needs new geometry: the same run shifted either way.
    const lines =
      pattern === 'double'
        ? group.lines.flatMap((line) => [
            offsetPolyline(line, style.doubleGap),
            offsetPolyline(line, -style.doubleGap),
          ])
        : group.lines
    const bucket = byPattern.get(pattern) ?? []
    for (const segment of polylinesToSegments(lines)) bucket.push(segment)
    byPattern.set(pattern, bucket)
  }

  const strokes: ComposedStroke[] = []
  // The frontier goes down first so a negotiated border always wins where the two meet.
  if (style.showFrontier && borders.frontier.length > 0)
    strokes.push({
      segments: polylinesToSegments(borders.frontier),
      color: style.frontierColor,
      width: style.frontierWidth,
      opacity: style.frontierOpacity,
      role: 'frontier',
    })
  for (const [pattern, segments] of byPattern) {
    if (segments.length === 0) continue
    const dashed = pattern === 'dashed'
    // An edging no wider than the core would be hidden by it entirely — skip the pass rather than pay
    // for an invisible one. It sits immediately before its own core, so the render order still pairs
    // them however many patterns are in play.
    // A border is dark at every scale. A patterned one stays a single dark stroke, because its meaning
    // is in its shape and a light inlay would break the shape up; a plain one takes the light inlay on
    // top, which the caller fades back out as the camera pulls away.
    if (pattern !== 'solid') {
      strokes.push({
        segments,
        color: style.edgeColor,
        // The core's weight, not the edge's: a broken line reads heavier than a continuous one at the
        // same width, because each dash carries its own two ends.
        width: style.coreWidth,
        opacity: style.opacity,
        dashed,
        role: 'pattern',
      })
      continue
    }
    strokes.push({
      segments,
      color: style.edgeColor,
      width: style.edgeWidth,
      opacity: style.opacity,
      role: 'edge',
    })
    // An inlay no narrower than the edge would cover it entirely — skip the pass rather than pay for
    // one that hides the very thing it sits inside.
    if (style.coreWidth < style.edgeWidth)
      strokes.push({
        segments,
        color: style.coreColor,
        width: style.coreWidth,
        opacity: style.opacity,
        role: 'inlay',
      })
  }
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
        dashed: stroke.dashed ?? false,
      })
      group.add(layer.object)
      // The stroke is kept beside its layer so the live setters can scale from the *built* value rather
      // than compounding on whatever the previous frame left behind.
      return { layer, stroke }
    })

  // The whole-line opacity scale, remembered so the inlay's own scale composes with it rather than
  // replacing it. The two are applied from different places in the same frame and must not fight.
  let globalOpacityScale = 1

  return {
    object: group,
    setResolution(viewportWidth: number, viewportHeight: number): void {
      for (const { layer } of layers) layer.setResolution(viewportWidth, viewportHeight)
    },
    setWidthScale(scale: number): void {
      for (const { layer, stroke } of layers) layer.setWidth(stroke.width * scale)
    },
    setInlayOpacity(scale: number): void {
      for (const { layer, stroke } of layers)
        if (stroke.role === 'inlay') layer.setOpacity(stroke.opacity * globalOpacityScale * scale)
    },
    setOpacityScale(scale: number): void {
      globalOpacityScale = scale
      for (const { layer, stroke } of layers) layer.setOpacity(stroke.opacity * scale)
    },
    dispose(): void {
      for (const { layer } of layers) {
        group.remove(layer.object)
        layer.dispose()
      }
    },
  }
}
