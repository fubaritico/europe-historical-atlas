/**
 * The flat drawings of the icons, for the map seen from afar: a kind's drawing (one file each beside this one) made
 * into an SVG, ringed with light, rasterised once.
 */

import { EVENT_ICON_PALETTE } from '../palette'

import { CROWN_DRAWING } from './crown'
import { SWORDS_DRAWING } from './swords'
import { TOWER_DRAWING } from './tower'

import type { Drawing, FlatShape, Paint } from './drawing'
import type { EventIconKind } from '../kinds'
import type { EventIconPalette } from '../palette'

/**
 * The flat icon's look: the light rim that detaches it from the map, the thin dark line that keeps a detailed drawing
 * crisp, and the flat colours of a drawing read at a few pixels.
 */
export interface EventIconSvgStyle {
  /** The rim's colour — light, against the map's strong colours (the dev, 2026-10-26). */
  rim: string
  /** The rim's width, in the drawing's units (the drawing is 64 across). */
  rimWidth: number
  /** The outline's colour, on a drawing that has one. */
  ink: string
  /** The outline's width. */
  inkWidth: number
  /**
   * The silhouette: one dark brown filling the whole drawing, with no line — chosen on the legibility bench, « B »
   * (the dev, 2026-10-27: *« un aplat marron foncé »*, then *« pas de trait noir »*), for the swords and the tower.
   */
  silhouette: string
}

/** The default look: a parchment-white rim, a dark brown outline for a detailed drawing, a dark brown silhouette. */
export const EVENT_ICON_SVG_STYLE: EventIconSvgStyle = {
  rim: '#fdf6e3',
  rimWidth: 4, // 6, thinned on sight (the dev, 2026-10-26)
  ink: '#3b2a1e',
  inkWidth: 0.9,
  silhouette: '#3b2a1e',
}

/** Each kind's drawing, one file each beside this one; type-check asks for a new kind's line. */
const DRAWINGS: Record<EventIconKind, Drawing> = {
  swords: SWORDS_DRAWING,
  tower: TOWER_DRAWING,
  crown: CROWN_DRAWING,
}

/**
 * The flat icon of a kind, for the map seen from afar (the dev, 2026-10-26): its shapes drawn twice — first in the
 * light rim, wide, so the whole silhouette is ringed with it; then in their colours, outlined when the drawing is.
 * @param kind - which icon
 * @param palette - the 3D icon's colours, which the detailed drawings share
 * @param style - the rim, the outline and the flat colours
 * @returns the SVG markup, with an explicit size so it rasterises (`svgToTexture`)
 */
export function eventIconSvg(
  kind: EventIconKind,
  palette: EventIconPalette = EVENT_ICON_PALETTE,
  style: EventIconSvgStyle = EVENT_ICON_SVG_STYLE
): string {
  return drawingSvg(DRAWINGS[kind], palette, style)
}

/**
 * Any drawing made into a flat icon, exactly as the map makes its own — what the legibility bench builds its
 * candidates with, so the one chosen there is the one the map shows.
 * @param drawing - the shapes, their crop and whether they are outlined
 * @param palette - the colours of the shapes that take the 3D icon's
 * @param style - the rim, the outline and the flat colours
 * @returns the SVG markup, with an explicit size so it rasterises (`svgToTexture`)
 */
export function drawingSvg(
  drawing: Drawing,
  palette: EventIconPalette,
  style: EventIconSvgStyle
): string {
  // A shape's colour: the flat drawing's own for a silhouette, the 3D palette's otherwise.
  const colourOf = (paint: Paint): string =>
    paint === 'silhouette' ? style.silhouette : palette[paint]
  // The drawing's groups as SVG, each shape given the paint `paint` says.
  const layer = (paint: (shape: FlatShape) => string): string =>
    drawing.groups
      .map(
        ({ transform, shapes }) =>
          `<g${transform === '' ? '' : ` transform="${transform}"`}>${shapes
            .map((shape) => shape.element.replace('/>', ` ${paint(shape)}/>`))
            .join('')}</g>`
      )
      .join('')
  // First pass: every shape in the rim colour with a wide stroke — the light ring around the silhouette.
  const rim = layer(
    () =>
      `fill="${style.rim}" stroke="${style.rim}" stroke-width="${String(style.rimWidth)}" stroke-linejoin="round"`
  )
  // Second pass, over it: the shapes in their colours, outlined if the drawing is.
  const outline = drawing.outlined
    ? ` stroke="${style.ink}" stroke-width="${String(style.inkWidth)}" stroke-linejoin="round"`
    : ''
  const body = layer((shape) => `fill="${colourOf(shape.colour)}"${outline}`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="${drawing.viewBox}">${rim}${body}</svg>`
}
