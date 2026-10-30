import {
  BRAND_GLYPH,
  BRAND_MARK_COLOURS,
  BRAND_MARK_WEIGHT,
  MAP_TYPEFACE,
  brandMarkGeometry,
} from '@europe-historical-atlas/core/utils/lettering'

/**
 * The atlas's mark as a standalone SVG document — the Cartographer's lambda on its vellum tile, at any side.
 *
 * One drawing for the admin's three places — the tab's icon, the navigation's and the login page's — so they
 * cannot drift. A document rather than inline markup because a favicon must be one; the other two show it
 * through an `<img>`. The lambda stays a text glyph in `MAP_TYPEFACE`, serifs and all: an SVG shown as an
 * image reads the machine's installed faces, Iowan Old Style on a Mac.
 * @param side - the tile's side, in CSS pixels
 * @returns the SVG document
 */
function brandMarkSvg(side: number): string {
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

/**
 * The mark as a `data:` address, for an `<img>` or a favicon — no file to serve.
 * @param side - the tile's side, in CSS pixels
 * @returns the address
 */
export function brandMarkDataUri(side: number): string {
  return `data:image/svg+xml,${encodeURIComponent(brandMarkSvg(side))}`
}
