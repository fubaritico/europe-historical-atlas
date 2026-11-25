/*
 * The start screen's two glyphs — « Nouvelle carte… » and « Ouvrir… » — three proposals each, for the dev to choose on
 * his own screen (CARTO-536, 2026-11-25: « comme Illustrator, avec des icônes »).
 *
 * **Drawn as lines, not as squares** (the dev the same evening: blurred, and jagged): a 1 px stroke on a 16-unit grid,
 * every straight segment on a half pixel — the way the cursors are drawn — so a straight line covers whole pixels and a
 * slanted one is smoothed, never a staircase. The first drawing, filled squares under `crispEdges`, gave stairs on every
 * slant, and blurred wherever the plate put a glyph between two pixels (its columns were shares of the width: x =
 * 512.33). Each glyph is shown at 16 px, at 32 px, and in place before its button's label, every box on whole pixels.
 */

/** One proposal: its letter, what it shows, and its drawing. */
interface Proposal {
  /** A, B or C. */
  letter: string
  /** What it draws. */
  what: string
  /** Its lines, as an SVG path on the 16-unit grid, straight segments on half units. */
  path: string
  /** A dotted frame, drawn with a 1-on, 1-off dash. */
  dotted?: string
}

/** « Nouvelle carte… »: the folded map with a plus; a sheet with a dog-ear and a plus; the bar's dotted plus. */
const NEW_MAP: readonly Proposal[] = [
  {
    letter: 'A',
    what: 'la carte pliée, un plus en bas à droite',
    path: 'M11.5 7V3.5H1.5V13.5H8M5.5 4V13M2 8.5H5M6 6.5H10M12.5 9V16M9 12.5H16',
  },
  {
    letter: 'B',
    what: 'une feuille cornée et un plus, comme le « New file » d’Illustrator',
    path: 'M3.5 1.5H9.5L12.5 4.5V14.5H3.5ZM9.5 1.5V4.5H12.5M8 7V12M5.5 9.5H10.5',
  },
  {
    letter: 'C',
    what: 'le plus dans un cadre pointillé, celui de la barre des pays',
    path: 'M7.5 4V11M4 7.5H11',
    dotted: 'M1.5 1.5H13.5V13.5H1.5Z',
  },
]

/** « Ouvrir… »: an open folder; a closed folder; the folded map with an arrow rising out of it. */
const OPEN: readonly Proposal[] = [
  {
    letter: 'A',
    what: 'un dossier ouvert, comme celui d’Illustrator',
    path: 'M1.5 13.5V2.5H5.5L6.5 3.5H12.5V7M1.5 13.5L3.5 7.5H14.5L12.5 13.5Z',
  },
  {
    letter: 'B',
    what: 'un dossier fermé',
    path: 'M1.5 2.5H5.5L6.5 3.5H14.5V13.5H1.5ZM1.5 5.5H14.5',
  },
  {
    letter: 'C',
    what: 'la carte pliée, une flèche qui en sort',
    path: 'M5 6.5H1.5V14.5H14.5V6.5H10M5.5 7V14M10.5 7V14M8 10V1.5M5.5 4L8 1.5L10.5 4',
  },
]

/**
 * A glyph, at a size that is a whole multiple of its grid.
 * @param props - the proposal and the size
 * @param props.proposal - what to draw
 * @param props.size - 16 or 32 CSS pixels
 * @returns the SVG
 */
function Glyph({ proposal, size }: { proposal: Proposal; size: number }) {
  // Render
  return (
    <svg
      className="start-icons__glyph"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      aria-hidden="true"
      focusable="false"
    >
      <path d={proposal.path} />
      {proposal.dotted === undefined ? null : <path d={proposal.dotted} strokeDasharray="1 1" />}
    </svg>
  )
}

/**
 * One row of proposals: each at 16 and 32 px, then in place before the label, as the start screen's column holds it.
 * @param props - the button's label, its proposals, whether it is the main button
 * @param props.label - the button's label
 * @param props.proposals - the three proposals
 * @param props.primary - the main button, filled
 * @returns the row
 */
function ProposalRow({
  label,
  proposals,
  primary,
}: {
  label: string
  proposals: readonly Proposal[]
  primary: boolean
}) {
  // Render
  return (
    <div className="start-icons__row">
      <h3 className="start-icons__label">{label}</h3>
      {proposals.map((proposal) => (
        <figure key={proposal.letter} className="start-icons__proposal">
          <figcaption>
            {proposal.letter} — {proposal.what}
          </figcaption>
          <div className="start-icons__sizes">
            <Glyph proposal={proposal} size={16} />
            <Glyph proposal={proposal} size={32} />
          </div>
          <span className={`start-icons__button${primary ? ' start-icons__button--primary' : ''}`}>
            <Glyph proposal={proposal} size={16} />
            {label}
          </span>
        </figure>
      ))}
    </div>
  )
}

/**
 * The plate: « Nouvelle carte… » and « Ouvrir… », three proposals each.
 * @returns the plate
 */
export function StartIconCandidates() {
  // Render
  return (
    <div className="start-icons">
      <ProposalRow label="Nouvelle carte…" proposals={NEW_MAP} primary />
      <ProposalRow label="Ouvrir…" proposals={OPEN} primary={false} />
    </div>
  )
}
