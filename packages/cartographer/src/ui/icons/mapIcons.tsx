/**
 * The glyphs of *Open…*'s list (`s19`, the dev, 2026-11-02: *"each item should have an icon, an icon for a map and a
 * slightly different icon for an automatic save"*): a folded map, and the same map with a small clock. Filled
 * rectangles on a 16-unit grid, every edge on a whole pixel, in `currentColor` — so a row's ink, selected or dimmed,
 * is the glyph's.
 */

/** Which glyph. */
export type MapIconKind = 'map' | 'autosave'

/** A filled rectangle: x, y, width, height, in grid units. */
type Rect = readonly [number, number, number, number]

/** The folded map: its outline, two folds, and strokes of coast across it. */
const MAP_RECTS: readonly Rect[] = [
  [1, 2, 14, 1],
  [1, 13, 14, 1],
  [1, 2, 1, 12],
  [14, 2, 1, 12],
  [5, 3, 1, 10],
  [10, 3, 1, 10],
  [2, 8, 3, 1],
  [6, 6, 4, 1],
  [11, 9, 3, 1],
]

/** The automatic save: the map cut short at its lower right, and a clock in its place — a ring and two hands. */
const AUTOSAVE_RECTS: readonly Rect[] = [
  // The map, its lower right left open for the clock.
  [1, 2, 14, 1],
  [1, 13, 7, 1],
  [1, 2, 1, 12],
  [14, 2, 1, 5],
  [5, 3, 1, 10],
  [10, 3, 1, 4],
  [2, 8, 3, 1],
  [6, 6, 4, 1],
  // The clock: a ring seven units across, centred on (12, 11).
  [11, 8, 3, 1],
  [10, 9, 1, 1],
  [14, 9, 1, 1],
  [9, 10, 1, 3],
  [15, 10, 1, 3],
  [10, 13, 1, 1],
  [14, 13, 1, 1],
  [11, 14, 3, 1],
  // Its hands.
  [12, 9, 1, 3],
  [13, 11, 1, 1],
]

/**
 * A map's glyph in *Open…*'s list, 16 × 16 CSS pixels. Decorative: the row's name says what it is.
 * @param props - which glyph
 * @param props.kind - a map, or an automatic save
 * @returns the SVG
 */
export function MapIcon({ kind }: { kind: MapIconKind }) {
  // Derived
  const rects = kind === 'map' ? MAP_RECTS : AUTOSAVE_RECTS

  // Render
  return (
    <svg
      className="map-icon"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      data-kind={kind}
    >
      {rects.map(([x, y, width, height]) => (
        <rect
          key={`${String(x)}-${String(y)}-${String(width)}`}
          x={x}
          y={y}
          width={width}
          height={height}
          fill="currentColor"
        />
      ))}
    </svg>
  )
}
