/**
 * A city's name as an image, set to the right of its mark (Imhof), in the countries' names' face — drawn on a canvas at
 * twice the screen's pixels, so it stays sharp on the map. Apart from the mark (`cityMarks`), because the levels of
 * detail bring a city's point a level before its name (`scene/detail/detailLevels`). The name grows with the order
 * (Bertin: size reads as an order), never in capitals (`CITY_NAME_TYPE`).
 */

import { CITY_MARKS, CITY_MARK_INK } from './cityMarks'

import type { CityImportance } from '@europe-historical-atlas/core/data/cityImportance'

/** The name drawn, and where the city's point sits against it. */
export interface CityLabelImage {
  /** The image, at {@link LABEL_RATIO} canvas pixels a CSS pixel. */
  readonly canvas: HTMLCanvasElement
  /** Its width on screen, in CSS pixels. */
  readonly width: number
  /** Its height on screen, in CSS pixels. */
  readonly height: number
  /** The city's point from the image's left edge, in CSS pixels — negative: the point is left of its name. */
  readonly anchorX: number
}

/** Draw a city's name — the canvas on the map, a stub in the tests. */
export type DrawCityLabel = (name: string, importance: CityImportance) => Promise<CityLabelImage>

/** Canvas pixels a CSS pixel: sharp on a screen of density two. */
export const LABEL_RATIO = 2

/** Room around the name, in CSS pixels, for its light edge. */
const PAD = 3

/** Between the mark's edge and its name, in CSS pixels. */
const GAP = 4

/** A name's type: its size in CSS pixels. */
export interface CityNameType {
  /** Its size, in CSS pixels. */
  readonly size: number
}

/**
 * The name's size per order, larger first (Bertin). **Never in capitals**: the countries' names are, and the case is
 * what tells a country from a city without a legend (Imhof) — the dev's screenshot of 2026-10-31 showed capitals'
 * names in capitals fighting the countries' from afar.
 */
export const CITY_NAME_TYPE: Readonly<Record<CityImportance, CityNameType>> = {
  capital: { size: 13 },
  'large-city': { size: 12 },
  city: { size: 11 },
}

/** The light edge under a name, the marks' own parchment at their rim's opacity. */
const NAME_EDGE = 'rgba(244, 236, 216, 0.6)'

/** Where a name sits, in CSS pixels — computed apart from the drawing, so it is tested with literals. */
export interface LabelLayout {
  /** The image's width. */
  width: number
  /** The image's height. */
  height: number
  /** The city's point from the image's left edge: negative, left of the name by half the mark and the gap. */
  anchorX: number
  /** Where the name starts, from the image's left edge. */
  textX: number
}

/**
 * Lay a name out, to the right of a mark centred on the city's point, on one middle line.
 * @param markSize - the mark's width
 * @param textWidth - the name's measured width
 * @param fontSize - the name's size
 * @returns where it sits
 */
export function layoutLabel(markSize: number, textWidth: number, fontSize: number): LabelLayout {
  return {
    width: Math.ceil(PAD + textWidth + PAD),
    height: Math.ceil(fontSize * 1.4 + 2 * PAD),
    anchorX: PAD - (markSize / 2 + GAP),
    textX: PAD,
  }
}

/**
 * The map's name drawer: the names' face loaded once, at the first name, then each name drawn on its own canvas.
 * @param faceUrl - the names' face (`nameFace`)
 * @returns the drawer; a face that cannot load rejects it, for the caller to say
 */
export function canvasLabelDrawer(faceUrl: string): DrawCityLabel {
  // Loaded at the first name, once: a map with no city never asks for it.
  let ready: Promise<FontFace> | null = null
  const loadFace = (): Promise<FontFace> => {
    if (ready === null) {
      const face = new FontFace('Fondamento', `url(${faceUrl})`)
      document.fonts.add(face)
      ready = face.load()
    }
    return ready
  }
  return async (name, importance) => {
    await loadFace()
    const type = CITY_NAME_TYPE[importance]
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('[Atlas] a city name has no 2D context')
    const font = `${String(type.size)}px Fondamento`
    context.font = font
    const layout = layoutLabel(
      CITY_MARKS[importance].size,
      context.measureText(name).width,
      type.size
    )
    canvas.width = layout.width * LABEL_RATIO
    canvas.height = layout.height * LABEL_RATIO
    // A canvas resized forgets its state: the face and the scale set again.
    context.scale(LABEL_RATIO, LABEL_RATIO)
    context.font = font
    context.textBaseline = 'middle'
    context.lineJoin = 'round'
    context.lineWidth = 3
    context.strokeStyle = NAME_EDGE
    context.strokeText(name, layout.textX, layout.height / 2)
    context.fillStyle = CITY_MARK_INK
    context.fillText(name, layout.textX, layout.height / 2)
    return { canvas, width: layout.width, height: layout.height, anchorX: layout.anchorX }
  }
}
