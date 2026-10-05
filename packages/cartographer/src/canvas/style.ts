import type { PaintStyle } from './painter'

/**
 * The painter's values, taken from `files/plans/cartographer/design/chrome.css`.
 *
 * **Read off the design, never chosen here** — the plan says the chrome's values come from that
 * stylesheet and never from its markup, and the same holds for what is painted on the canvas. Each entry
 * below names where it came from, so a change to the design can be traced to a change here.
 *
 * It lives beside the painter rather than inside it because the painter takes its style as an argument:
 * that is what lets a test assert a colour without knowing which one the design picked this week.
 */
export const CHROME_PAINT_STYLE: PaintStyle = {
  // `.canvas { background: #d9ccad … }` — the vellum the baked terrain will sit on at step 4d-3.
  background: '#d9ccad',
  // `.artboard { border: 1px solid rgba(42, 38, 31, 0.5) }` — the planche's frame.
  zoneStroke: 'rgba(42, 38, 31, 0.5)',
  // `.artboard-label { color: #4a4238; font-size: 11px }`.
  zoneLabel: '#4a4238',
  labelFont: '11px system-ui, sans-serif',
  // The edit stroke: "fin, net, bleu, sans gaine" (2026-09-22). `--accent: #5b93d6` is the selection
  // blue, RESERVED by the design and never served to a polity — so a trace can never be read as a
  // territory.
  pathStroke: '#5b93d6',
  pathWidth: 1,
  // A handle is white with a blue outline, solid blue when selected (the dev, 2026-09-22). `s02` wants it
  // "about 8 screen pixels across, at any zoom" — hence a radius of four.
  anchorFill: '#ffffff',
  anchorStroke: '#5b93d6',
  anchorRadius: 4,
}
