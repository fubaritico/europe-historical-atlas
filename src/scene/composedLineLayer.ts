import { Group } from 'three'

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
    })
  for (const [pattern, segments] of byPattern) {
    if (segments.length === 0) continue
    const dashed = pattern === 'dashed'
    // An edging no wider than the core would be hidden by it entirely — skip the pass rather than pay
    // for an invisible one. It sits immediately before its own core, so the render order still pairs
    // them however many patterns are in play.
    if (style.edgeWidth > style.coreWidth)
      strokes.push({
        segments,
        color: style.edgeColor,
        width: style.edgeWidth,
        opacity: style.opacity,
        dashed,
      })
    strokes.push({
      segments,
      color: style.coreColor,
      width: style.coreWidth,
      opacity: style.opacity,
      dashed,
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
