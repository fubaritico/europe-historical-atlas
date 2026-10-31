import type { CityImportance } from '@europe-historical-atlas/core/data/cityImportance'

/**
 * A city's mark on the map, one an order of importance (ATLAS-295, `files/plans/atlas/cities.md`) — chosen on the city
 * marks' bench by the dev, 2026-10-31, « C4 avec le blanc à 60 % »: a **capital** and a **large city** are a dark
 * ring around a dark point, the country's colour between them, the large city smaller; a **city** is a small dark
 * point. **The light only around, never inside** (*« tu mets du blanc que autour »*), and at 60 %, so the rim takes
 * the country's colour while still detaching the mark from it.
 */

/** The ink of the marks, the names' own brown. */
export const CITY_MARK_INK = '#2b1d14'

/** The parchment of the rim around each mark. */
export const CITY_MARK_RIM = '#f4ecd8'

/** The rim's opacity: the country's colour shows through it (the dev, 2026-10-31, « à 60 % »). */
export const CITY_MARK_RIM_OPACITY = 0.6

/** The field every mark is drawn in, centred on its middle. */
const FIELD = 24

/** A mark: its shapes in the 24-unit field, and its width on screen in CSS pixels. */
export interface CityMark {
  /** The SVG shapes, in a 0–24 field centred on 12, 12. */
  readonly shapes: string
  /** Its width on the map, in CSS pixels — the order's size, larger first. */
  readonly size: number
}

/**
 * A disc of ink centred in the field.
 * @param r - its radius
 * @returns the SVG shape
 */
function inkDisc(r: number): string {
  return `<circle cx="12" cy="12" r="${String(r)}" fill="${CITY_MARK_INK}"/>`
}

/**
 * A ring centred in the field, of ink or of the rim's parchment.
 * @param r - its radius, to the middle of its stroke
 * @param width - its stroke's width
 * @param light - the rim's parchment, at its opacity, rather than ink
 * @returns the SVG shape
 */
function ring(r: number, width: number, light: boolean): string {
  const colour = light
    ? `stroke="${CITY_MARK_RIM}" stroke-opacity="${String(CITY_MARK_RIM_OPACITY)}"`
    : `stroke="${CITY_MARK_INK}"`
  return `<circle cx="12" cy="12" r="${String(r)}" fill="none" ${colour} stroke-width="${String(width)}"/>`
}

/** A dark ring on its light rim — around a dark point, the capital's and the large city's mark. */
const RIMMED_RING = ring(10.6, 2.4, true) + ring(8.2, 2.4, false)

/** The three marks, highest order first. The capital's point is the larger (the dev, 2026-10-31: « c'était mieux »). */
export const CITY_MARKS: Readonly<Record<CityImportance, CityMark>> = {
  capital: { shapes: RIMMED_RING + inkDisc(4.5), size: 15 },
  'large-city': { shapes: RIMMED_RING + inkDisc(3), size: 11 },
  city: { shapes: ring(9.25, 3.5, true) + inkDisc(7.5), size: 6 },
}

/**
 * A city's mark as a whole SVG document, at a scale of its map size — with its `width` and `height`, which an SVG
 * loaded as an image for a texture needs (a `viewBox` alone rasterises to nothing).
 * @param importance - the city's order
 * @param scale - 1 for its size on the map, more for a sharper texture or a closer look
 * @returns the SVG
 */
export function cityMarkSvg(importance: CityImportance, scale = 1): string {
  if (!(Number.isFinite(scale) && scale > 0))
    throw new RangeError(`[Atlas] a city mark's scale must be positive: ${String(scale)}`)
  const mark = CITY_MARKS[importance]
  const size = String(mark.size * scale)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${String(FIELD)} ${String(FIELD)}">${mark.shapes}</svg>`
}
