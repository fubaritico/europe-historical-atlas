import { ToolIcon } from '../components/ToolIcon'

/*
 * The action bar's three glyphs, two ways — for the dev to choose on his own screen (2026-10-12):
 *   · his pixel drawing as he exported it, moved half a pixel so every edge lands on a whole pixel —
 *     the shapes themselves untouched;
 *   · the same drawing traced along its middle lines with the tool glyphs' 1.4 round stroke, so the three
 *     sit with the Pen and the Pencil.
 * Each sits in a 26 × 24 box placed on whole pixels, as the bar will place it, in the button's ink.
 */

/** A candidate glyph: the dev's filled shapes, and stroked middle lines, on the 18-unit grid. */
interface Candidate {
  /** What it is. */
  name: string
  /** The dev's polygons, verbatim from `src/ui/icons/` — each a `points` list. */
  polygons: readonly string[]
  /** The 1 × 1 squares of a dotted frame, as `[x, y]` — Illustrator's new-layer frame, on the plus. */
  dots?: readonly (readonly [number, number])[]
  /** The half-pixel move that puts the exported shapes on whole pixels; the shapes are untouched. */
  shift: string
  /** The middle lines of the same shapes, in the moved frame, for the 1.4 round stroke. */
  traced: readonly string[]
}

/** The three glyphs, from `src/ui/icons/` — the dev's drawing, 2026-10-12. */
const CANDIDATES: readonly Candidate[] = [
  {
    name: 'plus',
    polygons: [
      '9.5 8.5 9.5 5.5 8.5 5.5 8.5 8.5 5.5 8.5 5.5 9.5 8.5 9.5 8.5 12.5 9.5 12.5 9.5 9.5 12.5 9.5 12.5 8.5 9.5 8.5',
    ],
    // The dotted frame, verbatim from the dev's plus.svg: thirty 1 × 1 squares, one pixel apart.
    dots: [
      [0.5, 1.5],
      [2.5, 1.5],
      [4.5, 1.5],
      [6.5, 1.5],
      [8.5, 1.5],
      [10.5, 1.5],
      [12.5, 1.5],
      [14.5, 1.5],
      [16.5, 1.5],
      [16.5, 3.5],
      [16.5, 5.5],
      [16.5, 7.5],
      [16.5, 9.5],
      [16.5, 11.5],
      [16.5, 13.5],
      [16.5, 15.5],
      [14.5, 15.5],
      [12.5, 15.5],
      [10.5, 15.5],
      [8.5, 15.5],
      [6.5, 15.5],
      [4.5, 15.5],
      [2.5, 15.5],
      [0.5, 15.5],
      [0.5, 13.5],
      [0.5, 11.5],
      [0.5, 9.5],
      [0.5, 7.5],
      [0.5, 5.5],
      [0.5, 3.5],
    ],
    shift: 'translate(0.5 0.5)',
    traced: ['M9.5 6.7v5.6M6.7 9.5h5.6'],
  },
  {
    name: 'minus',
    polygons: ['5.5 8.5 12.5 8.5 12.5 9.5 5.5 9.5'],
    // The same dotted frame, verbatim from the dev's minus.svg.
    dots: [
      [0.5, 1.5],
      [2.5, 1.5],
      [4.5, 1.5],
      [6.5, 1.5],
      [8.5, 1.5],
      [10.5, 1.5],
      [12.5, 1.5],
      [14.5, 1.5],
      [16.5, 1.5],
      [16.5, 3.5],
      [16.5, 5.5],
      [16.5, 7.5],
      [16.5, 9.5],
      [16.5, 11.5],
      [16.5, 13.5],
      [16.5, 15.5],
      [14.5, 15.5],
      [12.5, 15.5],
      [10.5, 15.5],
      [8.5, 15.5],
      [6.5, 15.5],
      [4.5, 15.5],
      [2.5, 15.5],
      [0.5, 15.5],
      [0.5, 13.5],
      [0.5, 11.5],
      [0.5, 9.5],
      [0.5, 7.5],
      [0.5, 5.5],
      [0.5, 3.5],
    ],
    shift: 'translate(0.5 0.5)',
    traced: ['M6.7 9.5h5.6'],
  },
  {
    name: 'trash',
    polygons: [
      '13.5 4 12.5 4 11.5 4 10.5 4 9.5 4 8.5 4 7.5 4 6.5 4 5.5 4 4.5 4 3.5 4 3.5 5 4.5 5 4.5 6 4.5 7 4.5 8 4.5 9 4.5 10 4.5 11 4.5 12 4.5 13 4.5 14 4.5 15 5.5 15 5.5 14 5.5 13 5.5 12 5.5 11 5.5 10 5.5 9 5.5 8 5.5 7 5.5 6 5.5 5 6.5 5 7.5 5 8.5 5 9.5 5 10.5 5 11.5 5 12.5 5 12.5 6 12.5 7 12.5 8 12.5 9 12.5 10 12.5 11 12.5 12 12.5 13 12.5 14 12.5 15 13.5 15 13.5 14 13.5 13 13.5 12 13.5 11 13.5 10 13.5 9 13.5 8 13.5 7 13.5 6 13.5 5 14.5 5 14.5 4 13.5 4',
      '10.5 15 9.5 15 8.5 15 7.5 15 6.5 15 5.5 15 5.5 16 6.5 16 7.5 16 8.5 16 9.5 16 10.5 16 11.5 16 12.5 16 12.5 15 11.5 15 10.5 15',
      '10.5 7 10.5 8 10.5 9 10.5 10 10.5 11 10.5 12 10.5 13 10.5 14 11.5 14 11.5 13 11.5 12 11.5 11 11.5 10 11.5 9 11.5 8 11.5 7 11.5 6 10.5 6 10.5 7',
      '8.5 7 8.5 8 8.5 9 8.5 10 8.5 11 8.5 12 8.5 13 8.5 14 9.5 14 9.5 13 9.5 12 9.5 11 9.5 10 9.5 9 9.5 8 9.5 7 9.5 6 8.5 6 8.5 7',
      '6.5 7 6.5 8 6.5 9 6.5 10 6.5 11 6.5 12 6.5 13 6.5 14 7.5 14 7.5 13 7.5 12 7.5 11 7.5 10 7.5 9 7.5 8 7.5 7 7.5 6 6.5 6 6.5 7',
      '8.5 3 9.5 3 10.5 3 11.5 3 11.5 2 10.5 2 9.5 2 8.5 2 7.5 2 6.5 2 6.5 3 7.5 3 8.5 3',
    ],
    shift: 'translate(0.5 0)',
    traced: [
      'M4.7 4.5h9.6',
      'M7.7 2.5h3.6',
      'M5.5 5.2v9.3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V5.2',
      'M7.5 6.7v6.6M9.5 6.7v6.6M11.5 6.7v6.6',
    ],
  },
]

/**
 * A 26 × 24 box, the bar's button, holding an 18 px glyph — 4 px and 3 px of margin, whole pixels.
 * @param props - the glyph
 * @param props.children - the SVG
 * @returns the box
 */
function Slot({ children }: { children: React.ReactNode }) {
  // Render
  return (
    <span
      style={{
        display: 'inline-flex',
        // On the line's top, not its baseline: a baseline set by text lands on a fraction of a pixel.
        verticalAlign: 'top',
        width: 26,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--ink)',
      }}
    >
      {children}
    </span>
  )
}

/**
 * The dev's polygons, filled, moved half a pixel onto whole pixels — the shapes themselves untouched.
 * @param props - the candidate
 * @param props.candidate - which glyph
 * @returns the SVG
 */
function Pixels({ candidate }: { candidate: Candidate }) {
  // Render
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      <g transform={candidate.shift}>
        {candidate.polygons.map((points) => (
          <polygon key={points} points={points} />
        ))}
        {candidate.dots?.map(([x, y]) => (
          <rect key={`${String(x)},${String(y)}`} x={x} y={y} width={1} height={1} />
        ))}
      </g>
    </svg>
  )
}

/**
 * The same shapes traced with the tool glyphs' stroke.
 * @param props - the candidate
 * @param props.candidate - which glyph
 * @returns the SVG
 */
function Traced({ candidate }: { candidate: Candidate }) {
  // Render
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {candidate.traced.map((d) => (
        <path key={d} d={d} />
      ))}
      {/* The dotted frame stays a frame of dots, filled, on whole pixels — as in the pixel row. */}
      <g transform={candidate.shift} fill="currentColor" stroke="none">
        {candidate.dots?.map(([x, y]) => (
          <rect key={`${String(x)},${String(y)}`} x={x} y={y} width={1} height={1} />
        ))}
      </g>
    </svg>
  )
}

/**
 * The plate: the tool glyphs for reference, then each way of drawing the bar's three, in the bar's own boxes.
 * @returns the plate
 */
export function BarIconCandidates() {
  // Render
  return (
    <div
      className="workbench__panel"
      style={{ padding: 16, display: 'grid', gap: 12, lineHeight: '16px' }}
    >
      <div>
        <div>the tools today (1.4 stroke)</div>
        {(['navigate', 'draw', 'edit', 'pencil', 'retrace'] as const).map((name) => (
          <Slot key={name}>
            <ToolIcon name={name} />
          </Slot>
        ))}
      </div>
      <div>
        <div>the dev’s pixels, on whole pixels</div>
        {CANDIDATES.map((candidate) => (
          <Slot key={candidate.name}>
            <Pixels candidate={candidate} />
          </Slot>
        ))}
      </div>
      <div>
        <div>the same, traced with the tools’ 1.4 stroke</div>
        {CANDIDATES.map((candidate) => (
          <Slot key={candidate.name}>
            <Traced candidate={candidate} />
          </Slot>
        ))}
      </div>
    </div>
  )
}
