/**
 * The tools' glyphs, from the design's own set (`design/chrome.js`, `ICONS`): line icons on an 18×18 grid,
 * stroked in `currentColor` so a button colours its own glyph — light grey at rest, ink when pressed.
 */

/** The tools that have a glyph. */
export type ToolIconName = 'navigate' | 'draw' | 'edit' | 'pencil'

/** Each glyph's paths, copied verbatim from the design so the two cannot be told apart. */
const PATHS: Record<ToolIconName, readonly string[]> = {
  navigate: [
    'M7 11V4.5a1.2 1.2 0 0 1 2.4 0V9.5M9.4 9V3.4a1.2 1.2 0 0 1 2.4 0V9.5M11.8 9.5V5a1.2 1.2 0 0 1 2.4 0v6c0 3-2 5-5 5H9c-2 0-3-1-4-2.5L3 10.6a1.2 1.2 0 0 1 2-1.3L7 11',
  ],
  draw: ['M9 2l5 7-3.5 7h-3L4 9z', 'M9 2v7'],
  edit: ['M4.5 2v13l3.4-3.4 2.4 5 2-1-2.4-5H14.5z'],
  // Not in the design's set: drawn on the same grid and stroke as the Pen, a pencil laid at 45°, its
  // ferrule and its sharpened tip (2026-10-11).
  pencil: ['M12 2.5l3.5 3.5-9 9L2 16l1-4.5z', 'M10 4.5l3.5 3.5', 'M3 11.5l3.5 3.5'],
}

/**
 * A tool's glyph. Decorative: the button around it carries the name.
 * @param props - which glyph
 * @param props.name - the tool
 * @returns the SVG
 */
export function ToolIcon({ name }: { name: ToolIconName }) {
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
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
      {name === 'draw' ? <circle cx={9} cy={10.5} r={1.2} /> : null}
    </svg>
  )
}
