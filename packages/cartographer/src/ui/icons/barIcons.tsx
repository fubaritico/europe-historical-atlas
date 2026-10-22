/**
 * The action bar's glyphs — the dev's own pixel drawings, set on whole pixels.
 *
 * **The dev's verdict, 2026-10-12, after a long look at sharpness**: the tool glyphs keep their 1.4 stroke
 * and the slight blur that comes with it; **the bar is sharp** — *"ce qui doit être net est net"*. So these
 * are his drawings exported from Illustrator (`plus.svg`, `trash.svg` beside this file), filled shapes on an
 * 18-unit grid, and nothing else: the shapes are untouched, only **moved half a unit** so every edge lands on
 * a whole pixel — the export had them on half pixels, which blurs at 1× (at 2×, half a CSS pixel is a whole
 * device pixel). Measured in his browser before being chosen: 100 % full pixels at 1× and at 2×.
 *
 * Filled in `currentColor`, so a button's ink — enabled, hovered, disabled — is the glyph's.
 */

/** The glyphs the bar holds. No minus: deleting is the trash (the dev, 2026-10-12). */
export type BarIconName = 'plus' | 'trash'

/** One glyph: its filled shapes and the half-unit move onto whole pixels. */
interface BarGlyph {
  /** Polygons, as SVG `points` lists, verbatim from the dev's export. */
  polygons: readonly string[]
  /** 1 × 1 squares, as their top-left corner — the plus's dotted frame, Illustrator's new-layer mark. */
  dots: readonly (readonly [number, number])[]
  /** The move that puts the exported shapes on whole pixels. */
  shift: string
}

/** The plus's dotted frame: thirty 1 × 1 squares, one unit apart, verbatim from `plus.svg`. */
const DOTTED_FRAME: readonly (readonly [number, number])[] = [
  ...[0.5, 2.5, 4.5, 6.5, 8.5, 10.5, 12.5, 14.5, 16.5].map((x) => [x, 1.5] as const),
  ...[3.5, 5.5, 7.5, 9.5, 11.5, 13.5, 15.5].map((y) => [16.5, y] as const),
  ...[14.5, 12.5, 10.5, 8.5, 6.5, 4.5, 2.5, 0.5].map((x) => [x, 15.5] as const),
  ...[13.5, 11.5, 9.5, 7.5, 5.5, 3.5].map((y) => [0.5, y] as const),
]

/** The two glyphs, the dev's drawing of 2026-10-12. */
const GLYPHS: Record<BarIconName, BarGlyph> = {
  plus: {
    polygons: [
      '9.5 8.5 9.5 5.5 8.5 5.5 8.5 8.5 5.5 8.5 5.5 9.5 8.5 9.5 8.5 12.5 9.5 12.5 9.5 9.5 12.5 9.5 12.5 8.5 9.5 8.5',
    ],
    dots: DOTTED_FRAME,
    shift: 'translate(0.5 0.5)',
  },
  trash: {
    polygons: [
      '13.5 4 3.5 4 3.5 5 4.5 5 4.5 15 5.5 15 5.5 5 12.5 5 12.5 15 13.5 15 13.5 5 14.5 5 14.5 4 13.5 4',
      '5.5 15 5.5 16 12.5 16 12.5 15 5.5 15',
      '10.5 6 10.5 14 11.5 14 11.5 6 10.5 6',
      '8.5 6 8.5 14 9.5 14 9.5 6 8.5 6',
      '6.5 6 6.5 14 7.5 14 7.5 6 6.5 6',
      '6.5 2 6.5 3 11.5 3 11.5 2 6.5 2',
    ],
    dots: [],
    // The trash's rows already sit on whole units; only its columns were on halves.
    shift: 'translate(0.5 0)',
  },
}

/**
 * One of the bar's glyphs, at 18 × 18 CSS pixels — its native grid, so a unit is a pixel.
 * @param props - which glyph
 * @param props.name - the glyph
 * @returns the SVG, hidden from assistive tech: the button carries the name
 */
export function BarIcon({ name }: { name: BarIconName }) {
  // Derived
  const glyph = GLYPHS[name]

  // Render
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
      data-icon={name}
    >
      <g transform={glyph.shift}>
        {glyph.polygons.map((points) => (
          <polygon key={points} points={points} />
        ))}
        {glyph.dots.map(([x, y]) => (
          <rect key={`${String(x)},${String(y)}`} x={x} y={y} width={1} height={1} />
        ))}
      </g>
    </svg>
  )
}
