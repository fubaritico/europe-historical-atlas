/**
 * The start screen's glyphs (CARTO-536), chosen by the dev on 2026-11-25 among three proposals each on the workbench:
 * « Nouvelle carte… », a sheet with a dog-ear and a plus — Illustrator's « New file »; « Ouvrir… », an open folder —
 * Illustrator's too; « Accueil », a house — Illustrator's « Home ». **Drawn as lines**: a 1 px stroke on a 16-unit grid, every straight segment on a half pixel, so a
 * straight line covers whole pixels and a slant is smoothed, never a staircase (the dev: the first drawing, filled
 * squares under `crispEdges`, was jagged). In `currentColor`, so the button's ink is the glyph's.
 */

/** Which glyph. */
export type StartIconKind = 'newMap' | 'open' | 'home' | 'signOut'

/** Each glyph's lines, as an SVG path on the 16-unit grid. */
const PATHS: Readonly<Record<StartIconKind, string>> = {
  newMap: 'M3.5 1.5H9.5L12.5 4.5V14.5H3.5ZM9.5 1.5V4.5H12.5M8 7V12M5.5 9.5H10.5',
  open: 'M1.5 13.5V2.5H5.5L6.5 3.5H12.5V7M1.5 13.5L3.5 7.5H14.5L12.5 13.5Z',
  home: 'M1.5 8L8 2L14.5 8M3.5 6.5V13.5H6.5V9.5H9.5V13.5H12.5V6.5',
  // « Se déconnecter », in the top bar (CARTO-555): a door, and an arrow leaving it.
  signOut: 'M7.5 2.5H2.5V13.5H7.5M6 8H14M11 5L14 8L11 11',
}

/**
 * A glyph of the start screen, 16 × 16 CSS pixels. Decorative: the button's label says what it does.
 * @param props - which glyph
 * @param props.kind - « Nouvelle carte… », « Ouvrir… », « Accueil », or « Se déconnecter » in the top bar
 * @returns the SVG
 */
export function StartIcon({ kind }: { kind: StartIconKind }) {
  // Render
  return (
    <svg
      className="start-icon"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      aria-hidden="true"
      focusable="false"
      data-kind={kind}
    >
      <path d={PATHS[kind]} />
    </svg>
  )
}
