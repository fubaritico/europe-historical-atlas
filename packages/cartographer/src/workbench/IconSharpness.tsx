import { IconButton } from '@fubaritico/react/IconButton'

import arrowUrl from '../cursors/arrow.svg'
import crossUrl from '../cursors/cross.svg'
import handOpenUrl from '../cursors/hand-open.svg'
import minusUrl from '../icons/minus.svg'
import plusUrl from '../icons/plus.svg'
import trashUrl from '../icons/trash.svg'

/**
 * A glyph as one row of the comparison: today's paths, the aligned proposal, and what the circle of the
 * Pen becomes.
 */
interface GlyphRow {
  /** What the glyph is. */
  name: string
  /** Today's paths, on the design's grid with its 1.4 stroke — `null` for a glyph that does not exist yet. */
  today: readonly string[] | null
  /** The proposal: the same drawing with a 1 px stroke, every straight segment on a half pixel. */
  aligned: readonly string[]
  /** The Pen's nib, today and aligned, as `[cx, cy, r]`. */
  circle?: { today: [number, number, number]; aligned: [number, number, number] }
}

/** The glyphs compared — the four tools of the rail, and the two the panel's action bar needs. */
const ROWS: readonly GlyphRow[] = [
  {
    name: 'hand',
    today: [
      'M7 11V4.5a1.2 1.2 0 0 1 2.4 0V9.5M9.4 9V3.4a1.2 1.2 0 0 1 2.4 0V9.5M11.8 9.5V5a1.2 1.2 0 0 1 2.4 0v6c0 3-2 5-5 5H9c-2 0-3-1-4-2.5L3 10.6a1.2 1.2 0 0 1 2-1.3L7 11',
    ],
    aligned: [
      'M6.5 11V5a1.5 1.5 0 0 1 3 0v4.5',
      'M9.5 9.5V3.5a1.5 1.5 0 0 1 3 0v6',
      'M12.5 9.5V5a1.5 1.5 0 0 1 3 0v6.5c0 3-2 5-5 5H9.5c-2 0-3-1-4-2.5L3.5 10.5a1.25 1.25 0 0 1 2-1.5L6.5 11',
    ],
  },
  {
    name: 'pen',
    today: ['M9 2l5 7-3.5 7h-3L4 9z', 'M9 2v7'],
    aligned: ['M9.5 2.5l5 7-3.5 6.5h-3L4.5 9.5z', 'M9.5 2.5v7'],
    circle: { today: [9, 10.5, 1.2], aligned: [9.5, 11, 1] },
  },
  {
    name: 'arrow',
    today: ['M4.5 2v13l3.4-3.4 2.4 5 2-1-2.4-5H14.5z'],
    aligned: ['M4.5 2.5v12.5l3.5-3.5 2.5 5 2-1-2.5-5h4.5z'],
  },
  {
    name: 'pencil',
    today: ['M12 2.5l3.5 3.5-9 9L2 16l1-4.5z', 'M10 4.5l3.5 3.5', 'M3 11.5l3.5 3.5'],
    aligned: ['M12 2.5l3.5 3.5-9 9L2.5 15.5l1-4z', 'M10 4.5l3.5 3.5', 'M3.5 11.5l3 3'],
  },
  {
    name: 'plus',
    today: ['M9 3.5v11M3.5 9h11'],
    aligned: ['M9.5 3.5v11M3.5 9.5h11'],
  },
  {
    name: 'trash',
    today: null,
    aligned: ['M3.5 4.5h11', 'M7.5 4.5v-2h3v2', 'M5.5 4.5v11h7v-11', 'M7.5 7.5v5M10.5 7.5v5'],
  },
]

/**
 * One glyph, drawn at 18 px on its 18-unit grid — never scaled, so what is compared is what ships.
 * @param props - the paths, the stroke, and the Pen's nib if any
 * @param props.paths - the path data
 * @param props.stroke - the stroke width
 * @param props.circle - the nib, as `[cx, cy, r]`
 * @returns the SVG
 */
function Glyph({
  paths,
  stroke,
  circle,
}: {
  paths: readonly string[]
  stroke: number
  circle: [number, number, number] | undefined
}) {
  // Render
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
      {circle === undefined ? null : <circle cx={circle[0]} cy={circle[1]} r={circle[2]} />}
    </svg>
  )
}

/** An image laid in the line, as the reset would otherwise make it a block. */
const INLINE = { display: 'inline-block' } as const

/** The same, with room between the glyphs. */
const SPACED = { ...INLINE, margin: '0 8px' } as const

/**
 * The rows the glyphs are judged against: the header's `+` as it renders now, the dev's redraw as
 * exported, and three cursors — the reference of sharpness.
 * @returns the rows
 */
function ReferenceRows() {
  // Render
  return (
    <>
      <tr style={{ height: 34 }}>
        <td style={{ paddingRight: 24 }}>header + (design system, 12 px)</td>
        <td style={{ textAlign: 'center' }} className="polities__head">
          <IconButton icon="Plus" aria-label="New polity" />
        </td>
        <td />
        <td />
      </tr>
      <tr style={{ height: 34 }}>
        <td style={{ paddingRight: 24 }}>redrawn by the dev (18 px, as exported)</td>
        <td colSpan={3} style={{ textAlign: 'center', background: '#ffffff' }}>
          <img src={plusUrl} width={18} height={18} alt="plus" style={SPACED} />
          <img src={minusUrl} width={18} height={18} alt="minus" style={SPACED} />
          <img src={trashUrl} width={18} height={18} alt="trash" style={SPACED} />
        </td>
      </tr>
      <tr style={{ height: 44 }}>
        <td style={{ paddingRight: 24 }}>cursors (32 px, the reference)</td>
        <td colSpan={3} style={{ textAlign: 'center', background: '#7d7468' }}>
          <img src={handOpenUrl} width={32} height={32} alt="" style={INLINE} />
          <img src={crossUrl} width={32} height={32} alt="" style={INLINE} />
          <img src={arrowUrl} width={32} height={32} alt="" style={INLINE} />
        </td>
      </tr>
    </>
  )
}

/**
 * The sharpness plate: each glyph today and aligned at 1 and 2 px, side by side at 1:1, with the header's `+` as it
 * renders now and three cursors — the reference of sharpness, drawn 1 px on half pixels.
 * @returns the plate
 */
export function IconSharpness() {
  // Render
  return (
    <div className="workbench__panel" style={{ padding: 16, color: 'var(--ink)' }}>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', paddingRight: 24 }}>glyph</th>
            <th style={{ paddingRight: 24 }}>today — 1.4</th>
            <th style={{ paddingRight: 24 }}>aligned — 1 px</th>
            <th>aligned — 2 px</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.name} style={{ height: 34 }}>
              <td style={{ paddingRight: 24 }}>{row.name}</td>
              <td style={{ textAlign: 'center' }}>
                {row.today === null ? (
                  '—'
                ) : (
                  <Glyph paths={row.today} stroke={1.4} circle={row.circle?.today} />
                )}
              </td>
              <td style={{ textAlign: 'center' }}>
                <Glyph paths={row.aligned} stroke={1} circle={row.circle?.aligned} />
              </td>
              <td style={{ textAlign: 'center' }}>
                <Glyph paths={row.aligned} stroke={2} circle={row.circle?.aligned} />
              </td>
            </tr>
          ))}
          <ReferenceRows />
        </tbody>
      </table>
    </div>
  )
}
