import {
  BRAND_GLYPH,
  BRAND_MARK_WEIGHT,
  MAP_TYPEFACE,
  brandMarkGeometry,
} from '@europe-historical-atlas/core/utils/lettering'

/**
 * The tile's side, in CSS pixels. Smaller than a tool button's 30 (the dev, 2026-10-13): a filled tile weighs
 * far more than the rail's unfilled buttons, so at their size it outweighed every glyph on screen. 22 was
 * close; 20, a pixel off each side, is his.
 */
const MARK_SIZE = 20

/** The tile's corner, the lambda's size and its baseline at that side. */
const GEOMETRY = brandMarkGeometry(MARK_SIZE)

/**
 * The application's mark: the lambda that stands in for the A in HISTORICΛL ΛTLΛS, on a vellum tile. Decorative:
 * the application's name is written beside it.
 *
 * **Set in the map's own face** (the dev, 2026-10-13): the capital lambda written in `MAP_TYPEFACE` — Iowan
 * Old Style on a Mac — at the map title's weight, so it carries the same serifs and the same stroke
 * contrast as the lettering on the atlas. A pixel-built lambda was tried first and read as a bare
 * geometric shape. The cost is the one every letter pays: its edges are antialiased, never on whole
 * pixels; the tile itself is. Its geometry, measured here, lives in `core` since the CMS draws it too.
 *
 * A text glyph rather than a traced path: the face is the reader's own, and tracing it would ship its
 * outlines; the fallback is the stack's Palatino or Georgia, both of which carry Λ. The three applications'
 * tab icon is the same text glyph since 2026-11-10, drawn by core's `utils/brandMark` (REPO-415).
 *
 * Coloured by `--mark-ground` and `--mark-ink`, the atlas's vellum and border brown (`theme.css`).
 * @returns the SVG
 */
export function BrandMark() {
  // Render
  return (
    <svg
      className="brand-mark"
      width={MARK_SIZE}
      height={MARK_SIZE}
      viewBox={`0 0 ${String(MARK_SIZE)} ${String(MARK_SIZE)}`}
      aria-hidden="true"
    >
      <rect
        width={MARK_SIZE}
        height={MARK_SIZE}
        rx={GEOMETRY.radius}
        className="brand-mark__ground"
      />
      <text
        className="brand-mark__glyph"
        x={MARK_SIZE / 2}
        y={GEOMETRY.baseline}
        fontFamily={MAP_TYPEFACE}
        fontSize={GEOMETRY.glyphSize}
        fontWeight={BRAND_MARK_WEIGHT}
        textAnchor="middle"
        dominantBaseline="alphabetic"
      >
        {BRAND_GLYPH}
      </text>
    </svg>
  )
}
