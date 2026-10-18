import { Group } from 'three'

import { clamp01 } from '@europe-historical-atlas/core/utils/math'

import { FADE_HIDDEN } from './fadeHidden'
import { createLineLayer } from './lineLayer'

import type { LineLayerOptions, UvSegment } from './lineLayer'
import type { BorderPattern } from '@europe-historical-atlas/core/data/borderStyles'
import type { UvPoint } from '@europe-historical-atlas/core/data/coastlineSource'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionBorders'
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
 * Whether a chain closes on itself — its last point repeating its first.
 *
 * Three points cannot enclose anything once the repeat is discounted, so a ring needs more than that.
 * @param points - the chain
 * @returns `true` when it is a ring
 */
export function isClosedChain(points: readonly UvPoint[]): boolean {
  const head = points[0]
  const tail = points[points.length - 1]
  return points.length > 3 && !!head && !!tail && head.u === tail.u && head.v === tail.v
}

/**
 * The two points either side of a vertex — wrapping around a ring, clamped at the end of an open chain.
 * @param ring - the chain, without its repeated closing point
 * @param index - the vertex
 * @param closed - whether the chain wraps
 * @returns the neighbours, or `null` where the chain is too short to have them
 */
export function ringNeighbours(
  ring: readonly UvPoint[],
  index: number,
  closed: boolean
): { previous: UvPoint; next: UvPoint } | null {
  const count = ring.length
  const previous = ring[closed ? (index - 1 + count) % count : Math.max(0, index - 1)]
  const next = ring[closed ? (index + 1) % count : Math.min(count - 1, index + 1)]
  return previous && next ? { previous, next } : null
}

/**
 * The direction and reach of the mitre at one vertex.
 *
 * The vertex moves along the bisector of its two edges, scaled so the offset line stays parallel to the
 * original through the corner, and clamped by {@link MAX_MITER} so a hairpin cannot throw the vertex
 * across the map. At the end of an open chain one normal is zero, so the other one decides alone.
 * @param previous - the point before
 * @param here - the vertex
 * @param next - the point after
 * @returns the unit bisector and the mitre scale
 */
export function mitreAt(
  previous: UvPoint,
  here: UvPoint,
  next: UvPoint
): { u: number; v: number; scale: number } {
  const before = normalOf(previous, here)
  const after = normalOf(here, next)
  let mu = before.u + after.u
  let mv = before.v + after.v
  const length = Math.hypot(mu, mv)
  const flat = after.u === 0 && after.v === 0
  if (length < 1e-9) {
    // An end of an open chain (one normal is zero), or a reversal: take whichever normal exists.
    const only = flat ? before : after
    mu = only.u
    mv = only.v
  } else {
    mu /= length
    mv /= length
  }
  const reference = flat ? before : after
  const cosine = mu * reference.u + mv * reference.v
  return { u: mu, v: mv, scale: cosine > 1e-6 ? Math.min(MAX_MITER, 1 / cosine) : MAX_MITER }
}

/**
 * Shift a chain of points sideways by a fixed distance — the geometry behind a doubled border.
 *
 * Endpoints of an open chain use their single edge's normal; a closed chain is offset cyclically, or its
 * seam would show.
 * @param points - the chain
 * @param distance - how far to shift, in normalized grid units; negative shifts the other way
 * @returns the shifted chain
 */
export function offsetPolyline(points: readonly UvPoint[], distance: number): UvPoint[] {
  if (points.length < 2 || distance === 0) return [...points]
  const closed = isClosedChain(points)
  const ring = closed ? points.slice(0, -1) : points
  const out: UvPoint[] = []
  for (let i = 0; i < ring.length; i++) {
    const here = ring[i]
    const pair = ringNeighbours(ring, i, closed)
    if (!here || !pair) continue
    const mitre = mitreAt(pair.previous, here, pair.next)
    out.push({
      u: here.u + mitre.u * distance * mitre.scale,
      v: here.v + mitre.v * distance * mitre.scale,
    })
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
  /** Dash length in screen pixels, for borders the style table marks as broken (`setDashScale`). */
  dashSize: number
  /** Gap length in screen pixels, for those same borders. */
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
 * Gather every stretch by the pattern it is drawn with, rather than by the pair it separates.
 *
 * A century can hold hundreds of pairs, and one draw call per pair would trade a rendering problem for a
 * worse one. Three patterns means at most six passes, whatever the year.
 * @param groups - the stretches, grouped by the pair of polities they separate
 * @param patternFor - the pattern a pair is drawn with
 * @param doubleGap - how far either half of a doubled border sits from the true line
 * @returns the segments, by pattern
 */
export function groupSegmentsByPattern(
  groups: RegionBorders['between'],
  patternFor: (pair: readonly [number, number]) => BorderPattern,
  doubleGap: number
): Map<BorderPattern, UvSegment[]> {
  const byPattern = new Map<BorderPattern, UvSegment[]>()
  for (const group of groups) {
    const pattern = patternFor(group.pair)
    // A doubled border is the one pattern that needs new geometry: the same run shifted either way.
    const lines =
      pattern === 'double'
        ? group.lines.flatMap((line) => [
            offsetPolyline(line, doubleGap),
            offsetPolyline(line, -doubleGap),
          ])
        : group.lines
    const bucket = byPattern.get(pattern) ?? []
    for (const segment of polylinesToSegments(lines)) bucket.push(segment)
    byPattern.set(pattern, bucket)
  }
  return byPattern
}

/**
 * The passes one pattern is drawn with.
 *
 * A border is dark at every scale. A patterned one stays a single dark stroke, because its meaning is in
 * its shape and a light inlay would break that shape up; a plain one takes the light inlay on top, which
 * the caller fades back out as the camera pulls away.
 * @param pattern - how this group is drawn
 * @param segments - its stretches
 * @param style - how to dress them
 * @returns the passes, in draw order
 */
export function patternStrokes(
  pattern: BorderPattern,
  segments: UvSegment[],
  style: BorderStrokeStyle
): ComposedStroke[] {
  if (pattern !== 'solid') {
    return [
      {
        segments,
        color: style.edgeColor,
        // Built at the edge's weight so it matches a plain border at continent scale; the caller thins it
        // as the camera comes in, where a broken line reads heavier than a continuous one of the same
        // width because every dash carries its own two ends.
        width: style.edgeWidth,
        opacity: style.opacity,
        dashed: pattern === 'dashed',
        role: 'pattern',
      },
    ]
  }
  const strokes: ComposedStroke[] = [
    {
      segments,
      color: style.edgeColor,
      width: style.edgeWidth,
      opacity: style.opacity,
      role: 'edge',
    },
  ]
  // An inlay no narrower than the edge would cover it entirely — skip the pass rather than pay for one
  // that hides the very thing it sits inside.
  if (style.coreWidth < style.edgeWidth) {
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
 * The passes of the tribes' outlines: one dashed stroke per colour, at a border edge's weight, drawn after
 * the borders — a tribe has neither fill nor borders, its outline is its line (`core/editor/tribes`, the
 * Cartographer's `paintTribeOutlines`). A pattern pass, so it thins with the zoom as a dashed border does.
 * @param outlines - each tribe's closed rings and its colour
 * @param style - the weight and opacity of a border edge
 * @returns the passes, one per colour, in first-seen order
 */
export function tribeStrokes(
  outlines: readonly { colour: string; rings: readonly (readonly UvPoint[])[] }[],
  style: Pick<BorderStrokeStyle, 'edgeWidth' | 'opacity'>
): ComposedStroke[] {
  const byColour = new Map<string, UvSegment[]>()
  for (const { colour, rings } of outlines) {
    const bucket = byColour.get(colour) ?? []
    for (const segment of polylinesToSegments(rings)) bucket.push(segment)
    byColour.set(colour, bucket)
  }
  return [...byColour].map(([colour, segments]) => ({
    segments,
    color: colour,
    width: style.edgeWidth,
    opacity: style.opacity,
    dashed: true,
    role: 'pattern' as const,
  }))
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
 * @param patternFor - the pattern a pair of polities is drawn with
 * @returns the passes, in draw order
 */
export function buildBorderStrokes(
  borders: RegionBorders,
  style: BorderStrokeStyle,
  patternFor: (pair: readonly [number, number]) => BorderPattern = () => 'solid'
): ComposedStroke[] {
  const strokes: ComposedStroke[] = []
  // The frontier goes down first so a negotiated border always wins where the two meet.
  if (style.showFrontier && borders.frontier.length > 0) {
    strokes.push({
      segments: polylinesToSegments(borders.frontier),
      color: style.frontierColor,
      width: style.frontierWidth,
      opacity: style.frontierOpacity,
      role: 'frontier',
    })
  }
  const byPattern = groupSegmentsByPattern(borders.between, patternFor, style.doubleGap)
  for (const [pattern, segments] of byPattern) {
    if (segments.length > 0) strokes.push(...patternStrokes(pattern, segments, style))
  }
  return strokes
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
  const scales = { whole: 1, inlay: 1, fade: 1 }
  return {
    set(which, scale): void {
      scales[which] = scale
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

  const opacity = opacityScales(layers)

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
