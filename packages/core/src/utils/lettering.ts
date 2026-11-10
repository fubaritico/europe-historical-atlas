/**
 * How this atlas letters its own name.
 *
 * Shared because the name is now written twice — on the screen the reader meets first, and on the sheet
 * itself — and two typefaces for one title would say the two were different things.
 */

/** What the atlas is of, set above the outline on the splash and first on the sheet. */
export const ATLAS_SUBJECT = 'Europe'

/** What it is, set below the outline on the splash and second on the sheet. */
export const ATLAS_TITLE = 'Historical atlas'

/**
 * The whole name on one line, for the sheet, which stacks nothing.
 *
 * Derived rather than written out again: the splash stacks the two halves and the map runs them
 * together, and two literals that merely happen to agree today are the shape this codebase has already
 * been burned by once — fills and borders, each with their own idea of where a country ended.
 */
export const ATLAS_FULL_NAME = `${ATLAS_SUBJECT} ${ATLAS_TITLE}`

/**
 * The map's face: an old-style serif, with the fallbacks that actually ship on the machines it runs on.
 *
 * Quoted for CSS and for SVG alike, both of which take the same font-family syntax.
 */
export const MAP_TYPEFACE =
  "'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif"

/**
 * Swap every `A` for a capital lambda.
 *
 * A borrowed Greek letter is the oldest trick in cartographic lettering, and it costs nothing here
 * because the accessible name carries the real word — the play is in the glyphs, never in the text a
 * screen reader reads out.
 * @param text - the title, in plain words
 * @returns the same text with `A` and `a` rendered as `Λ`
 */
export function withLambdaForA(text: string): string {
  return text.replace(/[Aa]/g, 'Λ')
}

/**
 * The applications' mark: the capital lambda that stands in for the A in HISTORICΛL ΛTLΛS, set in `MAP_TYPEFACE` on a
 * vellum tile. Drawn by the Cartographer's top bar, by the CMS's admin, and as the three applications' tab icon
 * (`utils/brandMark`, REPO-415), at different sides.
 */
export const BRAND_GLYPH = 'Λ'

/** The mark's weight: the map title's (`atlas/src/scene/mapTitle.ts`), so its strokes match the lettering's. */
export const BRAND_MARK_WEIGHT = 500

/**
 * The mark's two colours, the atlas's own: its vellum and its border brown. The Cartographer's `theme.css` repeats
 * them as `--mark-ground` and `--mark-ink` (a stylesheet cannot read this module); the tab icon reads them here.
 */
export const BRAND_MARK_COLOURS = { ground: '#efe6d2', ink: '#5c3a2e' } as const

/** The side the mark was measured at, in the dev's Chrome (2026-10-13): the Cartographer's top bar. */
const MEASURED_SIDE = 20

/** The tile's corner radius at the measured side: slightly rounded, the dev's ask. */
const MEASURED_RADIUS = 4

/** The lambda's size at the measured side: its cap is 11.85 px tall in Iowan Old Style, leaving 4.1 px around it. */
const MEASURED_GLYPH_SIZE = 17

/**
 * The lambda's baseline at the measured side, centring its ink rather than its em box: 10 + 11.85 / 2, measured with
 * `measureText`. `dominant-baseline="central"` centres the em box, which left the cap 2.7 px from the top and 6.1 px
 * from the bottom.
 */
const MEASURED_BASELINE = 15.9

/** Where the mark's parts sit on a tile of a given side, in that tile's units. */
export interface BrandMarkGeometry {
  /** The tile's corner radius. */
  readonly radius: number
  /** The lambda's font size. */
  readonly glyphSize: number
  /** The lambda's alphabetic baseline, from the tile's top; the glyph is centred horizontally. */
  readonly baseline: number
}

/**
 * The mark's geometry at a side, scaled from the measured one — a glyph scales linearly, so the ink stays centred.
 * Rounded to the hundredth, so a side of 20 gives back the measured numbers exactly.
 * @param side - the tile's side, in CSS pixels
 * @returns its radius, the lambda's size and its baseline
 */
export function brandMarkGeometry(side: number): BrandMarkGeometry {
  const scale = side / MEASURED_SIDE
  return {
    radius: hundredth(MEASURED_RADIUS * scale),
    glyphSize: hundredth(MEASURED_GLYPH_SIZE * scale),
    baseline: hundredth(MEASURED_BASELINE * scale),
  }
}

/**
 * Round to the hundredth.
 * @param value - a length
 * @returns it, to two decimals
 */
function hundredth(value: number): number {
  return Math.round(value * 100) / 100
}
