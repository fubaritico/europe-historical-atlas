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
  zoneWidth: 1,
  // Not in the design, and the dev's call of 2026-10-09 after a screenshot where the zone could not be
  // found: everything outside the planche goes behind a quarter of black.
  zoneVeil: 'rgba(0, 0, 0, 0.25)',
  // `.artboard-label { color: #4a4238; font-size: 11px }`.
  zoneLabel: '#4a4238',
  labelSize: 11,
  labelFamily: 'system-ui, sans-serif',
  labelPad: 8,
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
  // The shoreline reads darker than the terrain's own painted edge, so it stays legible over land and
  // over sea alike — the same reasoning as the atlas's coastline ink, which this takes.
  coastStroke: 'rgba(60, 50, 38, 0.85)',
  coastWidth: 1,
  // Rivers sit a shade lighter and thinner: they are landmarks to aim at, not the subject.
  riverStroke: 'rgba(86, 107, 122, 0.75)',
  riverWidth: 1,
}

/**
 * The same style, with every length in **device** pixels.
 *
 * **The defect this exists for, found on 2026-10-09 from the dev's "le texte est tout petit".** The
 * backing store is sized `clientWidth × devicePixelRatio` and nothing ever scales the context, which is
 * deliberate — `view/`'s arithmetic is declared in device pixels, so positions land correctly. But every
 * value the design states in *screen* pixels was being used as a device pixel, so on a 2× display an
 * 11px label rendered at 5.5 CSS px, a 1px hairline at half a pixel, and an 8px handle at four. The
 * positions were right and the sizes were half, which reads as "the design is too small" rather than as
 * a bug.
 *
 * **Scaling the style rather than the context**, because scaling the context would double the positions
 * too — they are already in device pixels. And scaling it *here*, once, rather than at each use: a
 * multiplication repeated at eleven call sites is ten chances to forget one, and the one that is
 * forgotten is invisible on the machine of whoever wrote it if they are on a 1× display.
 * @param style - the design's values, in screen pixels
 * @param pixelRatio - device pixels per screen pixel
 * @returns the style, ready to paint with
 */
export function inDevicePixels(style: PaintStyle, pixelRatio: number): PaintStyle {
  return {
    ...style,
    zoneWidth: style.zoneWidth * pixelRatio,
    labelSize: style.labelSize * pixelRatio,
    labelPad: style.labelPad * pixelRatio,
    pathWidth: style.pathWidth * pixelRatio,
    anchorRadius: style.anchorRadius * pixelRatio,
    coastWidth: style.coastWidth * pixelRatio,
    riverWidth: style.riverWidth * pixelRatio,
  }
}
