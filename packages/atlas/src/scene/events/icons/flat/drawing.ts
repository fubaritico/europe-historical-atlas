/**
 * What a flat drawing is made of — shapes, their colours, the part of the field they fill — the same for every kind.
 */

import type { EventIconPalette } from '../palette'

/** Where a shape's colour comes from: the 3D icon's palette, or the flat drawing's own colours. */
export type Paint = keyof EventIconPalette | 'flatSteel' | 'flatHilt'

/** One shape of the drawing: its SVG element, and its colour. */
export interface FlatShape {
  /** The element, without its paint. */
  element: string
  /** Its colour. */
  colour: Paint
}

/** A kind's drawing: the part of the 64 × 64 field it fills, whether it is outlined, and its groups of shapes. */
export interface Drawing {
  /** The `viewBox`: cropped to the drawing, so none of the icon's pixels go to empty margin. */
  viewBox: string
  /** Whether the shapes get the thin dark outline — a detailed drawing does; flat colours read better without. */
  outlined: boolean
  /** Its groups of shapes, each with the transform it needs. */
  groups: { transform: string; shapes: FlatShape[] }[]
}
