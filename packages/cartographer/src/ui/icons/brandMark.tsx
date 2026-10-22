import { MAP_TYPEFACE } from '@europe-historical-atlas/core/utils/lettering'

/**
 * The application's mark: the lambda that stands in for the A in HISTORICΛL ΛTLΛS, on a vellum tile.
 *
 * **Set in the map's own face** (the dev, 2026-10-13): the capital lambda written in `MAP_TYPEFACE` — Iowan
 * Old Style on a Mac — at the map title's weight, so it carries the same serifs and the same stroke
 * contrast as the lettering on the atlas. A pixel-built lambda was tried first and read as a bare
 * geometric shape. The cost is the one every letter pays: its edges are antialiased, never on whole
 * pixels; the tile itself is.
 *
 * A text glyph rather than a traced path: the face is the reader's own, and tracing it would ship its
 * outlines. The atlas's favicon chose a stroked path for the opposite reason — at 16 px a missing Greek
 * face falls back to a box; here the fallback is the stack's Palatino or Georgia, both of which carry Λ.
 *
 * Coloured by `--mark-ground` and `--mark-ink`, the atlas's vellum and border brown (`theme.css`).
 */

/**
 * The tile's side, in CSS pixels. Smaller than a tool button's 30 (the dev, 2026-10-13): a filled tile weighs
 * far more than the rail's unfilled buttons, so at their size it outweighed every glyph on screen. 22 was
 * close; 20, a pixel off each side, is his.
 */
const MARK_SIZE = 20

/** The tile's corner radius: slightly rounded, the dev's ask. */
const MARK_RADIUS = 4

/** The map title's weight (`atlas/src/scene/mapTitle.ts`), so the strokes match. */
const MARK_WEIGHT = 500

/** The lambda's size: its cap is 11.85px tall in Iowan Old Style, leaving 4.1px of tile around it. */
const GLYPH_SIZE = 17

/**
 * The lambda's baseline, centring its ink rather than its em box: 10 + 11.85 / 2, measured with
 * `measureText` in the dev's Chrome (2026-10-13). `dominant-baseline="central"` centres the em box, which
 * left the cap 2.7px from the top and 6.1px from the bottom at the 22px size first tried.
 */
const GLYPH_BASELINE = 15.9

/**
 * The mark. Decorative: the application's name is written beside it.
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
      <rect width={MARK_SIZE} height={MARK_SIZE} rx={MARK_RADIUS} className="brand-mark__ground" />
      <text
        className="brand-mark__glyph"
        x={MARK_SIZE / 2}
        y={GLYPH_BASELINE}
        fontFamily={MAP_TYPEFACE}
        fontSize={GLYPH_SIZE}
        fontWeight={MARK_WEIGHT}
        textAnchor="middle"
        dominantBaseline="alphabetic"
      >
        Λ
      </text>
    </svg>
  )
}
