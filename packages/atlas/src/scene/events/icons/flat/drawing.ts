/**
 * What a flat drawing is made of — shapes, their colours, the part of the field they fill — the same for every kind.
 */

import type { EventIconPalette } from '../palette'

/**
 * Where a shape's colour comes from: the 3D icon's palette, the flat drawing's one dark silhouette, or the light of
 * its rim — a sign set solid on the silhouette, as the tomb's cross is.
 */
export type Paint = keyof EventIconPalette | 'silhouette' | 'rim'

/** One shape of the drawing: its SVG element, and its colour. */
export interface FlatShape {
  /** The element, without its paint. */
  element: string
  /** Its colour. */
  colour: Paint
}

/** A kind's drawing: the part of the 64 × 64 field it fills, whether it is outlined, and its groups of shapes. */
export interface Drawing {
  /**
   * The `viewBox`, `[x, y, width, height]`: cropped to the drawing and its rim, so none of the icon's pixels go to
   * empty margin. Its width also sets how thick the rim is drawn (`eventIconSvg`).
   */
  viewBox: [number, number, number, number]
  /** Whether the shapes get the thin dark outline — a detailed drawing does; flat colours read better without. */
  outlined: boolean
  /** Its groups of shapes, each with the transform it needs. */
  groups: { transform: string; shapes: FlatShape[] }[]
  /**
   * The x of its field that stands over its place, for a drawing that is not planted by its middle — an oriflamme's
   * staff, which its 3D model plants on the place (the dev, 2026-11-20: *"the mast is offset from the point it is
   * meant to mark, which does not happen with the 3D one"*). Left out, the drawing stands by its middle, as a
   * symmetrical one does.
   */
  standsAt?: number
}
