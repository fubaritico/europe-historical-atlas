/**
 * The chrome's line glyphs — undo, redo, close, the layers' eye — verbatim from the design's set (`design/chrome.js`, `ICONS`):
 * an 18-unit grid stroked at 1.4 in `currentColor`, drawn at the size the design gives each (14 for the
 * history, 9 for a tab's close). The same family and the same accepted softness as the tool glyphs
 * (`toolIcons.tsx`, `known-issues.md`).
 */

/** The glyphs the bars hold. */
export type ChromeIconName = 'undo' | 'redo' | 'close' | 'eyeOpen' | 'eyeShut'

/** Each glyph's paths, copied from the design so the two cannot be told apart. */
const PATHS: Record<ChromeIconName, readonly string[]> = {
  undo: ['M6 4L2.5 7.5 6 11', 'M2.5 7.5H11a4 4 0 0 1 0 8H8'],
  redo: ['M12 4l3.5 3.5L12 11', 'M15.5 7.5H7a4 4 0 0 0 0 8h3'],
  close: ['M3 3l12 12M15 3L3 15'],
  eyeOpen: ['M1.5 9C4 4.6 14 4.6 16.5 9 14 13.4 4 13.4 1.5 9z'],
  eyeShut: ['M1.5 9C4 4.6 14 4.6 16.5 9 14 13.4 4 13.4 1.5 9z', 'M3 15L15 3'],
}

/**
 * One of the bars' glyphs. Decorative: the button around it carries the name.
 * @param props - which glyph, and how large
 * @param props.name - the glyph
 * @param props.size - its side in CSS pixels
 * @returns the SVG
 */
export function ChromeIcon({ name, size }: { name: ChromeIconName; size: number }) {
  // Render
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-icon={name}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
      {/* The open eye's pupil, a circle in the design's set rather than a path. */}
      {name === 'eyeOpen' ? <circle cx={9} cy={9} r={2.2} /> : null}
    </svg>
  )
}
