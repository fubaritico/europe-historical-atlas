/**
 * **The atlas's mark as one SVG document, for the three applications** (REPO-415, the dev, 2026-11-10: _"all the
 * applications use the same icon, the same favicon, as the CMS"_): the lambda on its vellum tile — the CMS's tab, its
 * navigation and its login page, the atlas's and the Cartographer's tab (`atlas/public/favicon.svg`, written from here
 * and held to it by a test). One drawing, so the three cannot drift.
 *
 * The lambda stays a text glyph in `MAP_TYPEFACE`, serifs and all: an SVG shown as an image reads the machine's installed
 * faces, Iowan Old Style on a Mac.
 */

import {
  BRAND_GLYPH,
  BRAND_MARK_COLOURS,
  BRAND_MARK_WEIGHT,
  MAP_TYPEFACE,
  brandMarkGeometry,
} from './lettering'

/** The side the tab's icon is drawn at; the browser scales it to its 16 or 32 px. */
export const TAB_MARK_SIDE = 32

/**
 * The mark as a standalone SVG document, at any side.
 * @param side - the tile's side, in CSS pixels
 * @returns the SVG document
 */
export function brandMarkSvg(side: number): string {
  const { radius, glyphSize, baseline } = brandMarkGeometry(side)
  const s = String(side)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">` +
    `<rect width="${s}" height="${s}" rx="${String(radius)}" fill="${BRAND_MARK_COLOURS.ground}"/>` +
    `<text x="${String(side / 2)}" y="${String(baseline)}" font-family="${MAP_TYPEFACE}" ` +
    `font-size="${String(glyphSize)}" font-weight="${String(BRAND_MARK_WEIGHT)}" text-anchor="middle" ` +
    `dominant-baseline="alphabetic" fill="${BRAND_MARK_COLOURS.ink}">${BRAND_GLYPH}</text>` +
    `</svg>`
  )
}
