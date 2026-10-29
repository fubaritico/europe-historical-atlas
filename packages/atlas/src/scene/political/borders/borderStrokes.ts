/**
 * How a year's borders are dressed: which passes each pattern is drawn with, in what order, and how the light inlay
 * shows with the zoom. Pure — the strokes are data, drawn by `composedLineLayer`.
 */

import { clamp01 } from '@europe-historical-atlas/core/utils/math'

import { offsetPolyline, polylinesToSegments } from '../../lines/polylines'

import type { ComposedStroke } from './composedLineLayer'
import type { UvSegment } from '../../lines/lineLayer'
import type { BorderPattern } from '@europe-historical-atlas/core/data/borderStyles'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionBorders'

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
  /** Width of that under-stroke. A core no narrower than it would cover it, so the core's pass is then skipped. */
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
  /** The parchment the line work is drawn in from afar, and the vassals' borders at every zoom. */
  parchmentColor: string
  /** Width of a border between sovereigns from afar, in parchment. */
  farWidth: number
  /** Width of the frontier from afar, in parchment. */
  frontierFarWidth: number
  /** How far beside the frontier its parchment line runs close up, on the unclaimed side, in grid units. */
  frontierSideGap: number
  /** Width of that parchment line. */
  frontierSideWidth: number
  /** Share of its opacity the fading line beyond it takes. */
  frontierFadeShare: number
  /** Colour of a border between vassals. */
  vassalColor: string
  /** Width of a border between vassals. */
  vassalWidth: number
  /** Length of each of its dots, in screen pixels. */
  vassalDotSize: number
  /** Gap between two of its dots, in screen pixels. */
  vassalDotGap: number
  /** Dash length in screen pixels, for borders the style table marks as broken (`setDashScale`). */
  dashSize: number
  /** Gap length in screen pixels, for those same borders. */
  gapSize: number
  /** Half the distance between the two runs of a doubled border, in normalized grid units. */
  doubleGap: number
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
    // Cut the lines into segments and add them to their pattern's bucket.
    const bucket = byPattern.get(pattern) ?? []
    for (const segment of polylinesToSegments(lines)) bucket.push(segment)
    byPattern.set(pattern, bucket)
  }
  return byPattern
}

/**
 * A border between vassals: one thin white stroke of dots (*« passe les frontières entre vassaux en blanc »*), whatever its pattern (the dev, 2026-10-29: *« entre
 * vassaux plus fin, essayer de n'avoir que des points, pas de tirets »*) — each dot a dash about as long as the line is
 * wide, which three cuts square (`LineMaterial`) and reads as a point at this size.
 * @param segments - its stretches
 * @param style - how to dress them
 * @returns the pass
 */
function vassalStroke(segments: UvSegment[], style: BorderStrokeStyle): ComposedStroke {
  return {
    segments,
    color: style.vassalColor,
    width: style.vassalWidth,
    opacity: style.opacity,
    dashed: true,
    dashSize: style.vassalDotSize,
    gapSize: style.vassalDotGap,
    role: 'vassal',
  }
}

/**
 * The passes one pattern is drawn with.
 *
 * A border between vassals is one thin dotted parchment stroke at every zoom (the dev, 2026-10-29: *« frontière entre
 * vassaux couleur parchemin »*). Between sovereigns, a patterned border stays a single dark
 * stroke, because its meaning is in its shape and a light inlay would break that shape up; a plain one is a thin
 * parchment line from afar (*« couleur parchemin, un peu plus fin »*), and close up the dark edge with the light
 * inlay on top — the caller crosses from one to the other with the zoom (`setCloseness`).
 * @param pattern - how this group is drawn
 * @param segments - its stretches
 * @param style - how to dress them
 * @param vassal - whether the group lies between vassals — shown only once the zoom shows them
 * @returns the passes, in draw order
 */
export function patternStrokes(
  pattern: BorderPattern,
  segments: UvSegment[],
  style: BorderStrokeStyle,
  vassal = false
): ComposedStroke[] {
  if (vassal) return [vassalStroke(segments, style)]
  // A patterned border: one dark stroke, dashed when the pattern says so.
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
  // A plain border: the parchment line seen from afar, then the dark edge, the light inlay laid inside it.
  const strokes: ComposedStroke[] = [
    {
      segments,
      color: style.parchmentColor,
      width: style.farWidth,
      opacity: style.opacity,
      role: 'far',
    },
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
 * Choose the passes that dress a set of derived borders.
 *
 * Pure, and separated from the drawing precisely so it can be exercised without a renderer: the ordering
 * *is* the technique. The widest stroke goes down first and each later one lands on top, so the wide
 * under-stroke survives only as an edging either side of the narrow core — which is how a composed
 * border is obtained without any parallel-offset geometry at all.
 * @param borders - the derived stretches, by kind
 * @param style - how to dress them
 * @param patternFor - the pattern a pair of polities is drawn with
 * @param vassal - whether the borders lie between vassals — a split level past the sovereigns'
 * @returns the passes, in draw order
 */
export function buildBorderStrokes(
  borders: RegionBorders,
  style: BorderStrokeStyle,
  patternFor: (pair: readonly [number, number]) => BorderPattern = () => 'solid',
  vassal = false
): ComposedStroke[] {
  const strokes: ComposedStroke[] = []
  // The frontier goes down first so a negotiated border always wins where the two meet.
  if (style.showFrontier && borders.frontier.length > 0)
    strokes.push(...frontierStrokes(borders.frontier, style))
  // Then the borders between polities, pattern by pattern, each with its own passes.
  const byPattern = groupSegmentsByPattern(borders.between, patternFor, style.doubleGap)
  for (const [pattern, segments] of byPattern) {
    if (segments.length > 0) strokes.push(...patternStrokes(pattern, segments, style, vassal))
  }
  return strokes
}

/**
 * The passes of the frontier against land nobody claims (the dev, 2026-10-29): a thin parchment line from afar; close
 * up, the dark stroke on the limit, a parchment one beside it on the unclaimed side, and beyond it the same line half
 * gone, so the frontier fades into the ground nobody claims. An authored year's frontier
 * runs with its polity on its left, north up (`core/editor/atlasBorders`), and a positive offset falls on its right.
 * @param frontier - the frontier's runs
 * @param style - how to dress them
 * @returns the passes, in draw order
 */
export function frontierStrokes(
  frontier: RegionBorders['frontier'],
  style: BorderStrokeStyle
): ComposedStroke[] {
  const segments = polylinesToSegments(frontier)
  const beside = (times: number): UvSegment[] =>
    polylinesToSegments(frontier.map((line) => offsetPolyline(line, style.frontierSideGap * times)))
  return [
    {
      segments,
      color: style.parchmentColor,
      width: style.frontierFarWidth,
      opacity: style.frontierOpacity,
      role: 'far',
    },
    // Beyond the parchment line, as far again, the same line half gone: the frontier fading into the unclaimed ground.
    {
      segments: beside(2),
      color: style.parchmentColor,
      width: style.frontierSideWidth,
      opacity: style.opacity * style.frontierFadeShare,
      role: 'side',
    },
    {
      segments: beside(1),
      color: style.parchmentColor,
      width: style.frontierSideWidth,
      // The vassals' parchment tone, at the borders' opacity (the dev, 2026-10-29: « comme le zoomé des frontières
      // entre vassaux »), not the fainter frontier's.
      opacity: style.opacity,
      role: 'side',
    },
    {
      segments,
      color: style.frontierColor,
      width: style.frontierWidth,
      opacity: style.frontierOpacity,
      role: 'frontier',
    },
  ]
}
