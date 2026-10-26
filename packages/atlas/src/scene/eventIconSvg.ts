import { EVENT_ICON_PALETTE } from './eventIcons'

import type { EventIconKind, EventIconPalette } from './eventIcons'

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
  /** A flat blade: grey, darker than the 3D steel, so it holds on the parchment (the dev, 2026-10-26). */
  flatSteel: string
  /** A flat hilt — guard, grip, pommel: dark, against the grey blade. */
  flatHilt: string
}

/** The default look: a parchment-white rim, a dark brown outline, a dark grey blade on a near-black hilt. */
export const EVENT_ICON_SVG_STYLE: EventIconSvgStyle = {
  rim: '#fdf6e3',
  rimWidth: 4, // 6, thinned on sight (the dev, 2026-10-26)
  ink: '#3b2a1e',
  inkWidth: 0.9,
  flatSteel: '#7b828c',
  flatHilt: '#3b2a1e',
}

/** Where a shape's colour comes from: the 3D icon's palette, or the flat drawing's own colours. */
type Paint = keyof EventIconPalette | 'flatSteel' | 'flatHilt'

/** One shape of the drawing: its SVG element, and its colour. */
interface Shape {
  /** The element, without its paint. */
  element: string
  /** Its colour. */
  colour: Paint
}

/** A kind's drawing: the part of the 64 × 64 field it fills, whether it is outlined, and its groups of shapes. */
interface Drawing {
  /** The `viewBox`: cropped to the drawing, so none of the icon's pixels go to empty margin. */
  viewBox: string
  /** Whether the shapes get the thin dark outline — a detailed drawing does; flat colours read better without. */
  outlined: boolean
  /** Its groups of shapes, each with the transform it needs. */
  groups: { transform: string; shapes: Shape[] }[]
}

/**
 * One sword in flat colours, point up along the drawing's vertical middle: a wide blade, a short guard set well below
 * the crossing so the two guards of a pair never meet and make another shape (the dev, 2026-10-26), a grip ending
 * in a small pommel (it was too big).
 * Chosen on the legibility bench (`/svg-icons.html`, « C2 »).
 * @returns its shapes
 */
function flatSword(): Shape[] {
  return [
    { element: '<path d="M28.5 16 L32 8 L35.5 16 L35.5 44 L28.5 44 Z"/>', colour: 'flatSteel' },
    { element: '<rect x="26" y="43" width="12" height="6" rx="1.5"/>', colour: 'flatHilt' },
    { element: '<rect x="29.5" y="49" width="5" height="7"/>', colour: 'flatHilt' },
    { element: '<circle cx="32" cy="56.5" r="2.5"/>', colour: 'flatHilt' },
  ]
}

/** Each kind's drawing. The swords are the bench's choice; the tower and the crown wait for their own pass. */
const DRAWINGS: Record<EventIconKind, Drawing> = {
  swords: {
    // The pair, crossed about the field's middle, reaches 22 from it with its pommels and their rim.
    viewBox: '10 10 44 44',
    outlined: false,
    groups: [
      { transform: 'rotate(45 32 32)', shapes: flatSword() },
      { transform: 'rotate(-45 32 32)', shapes: flatSword() },
    ],
  },
  tower: {
    viewBox: '0 0 64 64',
    outlined: true,
    groups: [
      {
        transform: '',
        shapes: [
          { element: '<path d="M20 58 L22 22 L42 22 L44 58 Z"/>', colour: 'stone' },
          {
            element:
              '<path d="M18 22 L18 12 L24 12 L24 16 L29 16 L29 12 L35 12 L35 16 L40 16 L40 12 L46 12 L46 22 Z"/>',
            colour: 'stone',
          },
          { element: '<path d="M28 58 L28 48 Q32 43 36 48 L36 58 Z"/>', colour: 'door' },
        ],
      },
    ],
  },
  crown: {
    viewBox: '0 0 64 64',
    outlined: true,
    groups: [
      {
        transform: '',
        shapes: [
          {
            element: '<path d="M12 46 L10 20 L22 32 L32 14 L42 32 L54 20 L52 46 Z"/>',
            colour: 'gold',
          },
          { element: '<rect x="12" y="46" width="40" height="8" rx="1"/>', colour: 'gold' },
          { element: '<circle cx="32" cy="50" r="2.5"/>', colour: 'jewel' },
        ],
      },
    ],
  },
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
  const drawing = DRAWINGS[kind]
  const colourOf = (paint: Paint): string =>
    paint === 'flatSteel' || paint === 'flatHilt' ? style[paint] : palette[paint]
  const layer = (paint: (shape: Shape) => string): string =>
    drawing.groups
      .map(
        ({ transform, shapes }) =>
          `<g${transform === '' ? '' : ` transform="${transform}"`}>${shapes
            .map((shape) => shape.element.replace('/>', ` ${paint(shape)}/>`))
            .join('')}</g>`
      )
      .join('')
  const rim = layer(
    () =>
      `fill="${style.rim}" stroke="${style.rim}" stroke-width="${String(style.rimWidth)}" stroke-linejoin="round"`
  )
  const outline = drawing.outlined
    ? ` stroke="${style.ink}" stroke-width="${String(style.inkWidth)}" stroke-linejoin="round"`
    : ''
  const body = layer((shape) => `fill="${colourOf(shape.colour)}"${outline}`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="${drawing.viewBox}">${rim}${body}</svg>`
}
