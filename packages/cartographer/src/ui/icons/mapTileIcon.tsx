/**
 * The large glyph of a map on the start screen's tiles (CARTO-536), 48 × 48 CSS pixels — Illustrator's preset icons, a
 * thin outline: a map folded in three, its panels drawn by the folds. In lines, 1 px on half pixels, as the start
 * screen's other glyphs (`startIcons.tsx`). The map's thumbnail takes its place once there is one (CARTO-554).
 * Decorative: the tile's name says which map it is.
 * @returns the SVG
 */
export function MapTileIcon() {
  // Render
  return (
    <svg
      className="map-tile-icon"
      width={48}
      height={48}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6.5 12.5L18.5 8.5L30.5 12.5L42.5 8.5V36.5L30.5 40.5L18.5 36.5L6.5 40.5ZM18.5 8.5V36.5M30.5 12.5V40.5" />
    </svg>
  )
}
