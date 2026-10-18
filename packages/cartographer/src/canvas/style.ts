import { RIVER_DISPLAY, riverStrokeCss } from '@europe-historical-atlas/core/data/riverDisplay'

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
  // A neighbour's anchor the Pen can branch from: a dot, half a handle (2026-10-13).
  snapAnchorRadius: 2,
  // The stretch a retrace would replace: `--warn` (theme.css), the palette's one alert ink (2026-10-14).
  replacedStroke: '#c86a52',
  // The atlas's border, from its political defaults (`atlas/src/devParams/political.ts`): a cream core inside
  // a dark brown casing, because no single ink reads against every fill; the frontier is the casing alone.
  borderCore: '#f3e7cd',
  borderEdge: '#5c3a2e',
  borderWidth: 1.4,
  borderEdgeWidth: 3.2,
  frontierWidth: 2.4,
  // The atlas's political tint, at full strength — the dev's call, 2026-10-11, over the mockup's 70 %.
  fillBlend: 'overlay',
  // The shoreline reads darker than the terrain's own painted edge, so it stays legible over land and
  // over sea alike — the same reasoning as the atlas's coastline ink, which this takes.
  coastStroke: 'rgba(60, 50, 38, 0.85)',
  coastWidth: 1,
  // The atlas's rivers, drawn the atlas's way — its ink, its opacity, its width by rank — from the one
  // definition both read (the dev's call, 2026-10-12: "exactement la même chose que dans l'application").
  riverStroke: riverStrokeCss(RIVER_DISPLAY),
  riverWidthMajor: RIVER_DISPLAY.widthMajor,
  riverWidthMinor: RIVER_DISPLAY.widthMinor,
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
 * multiplication repeated at every call site is ten chances to forget one, and the one that is
 * forgotten is invisible on the machine of whoever wrote it if they are on a 1× display.
 * @param style - the design's values, in screen pixels
 * @param pixelRatio - device pixels per screen pixel
 * @returns the style, ready to paint with
 */
export function inDevicePixels(style: PaintStyle, pixelRatio: number): PaintStyle {
  return {
    ...style,
    pathWidth: style.pathWidth * pixelRatio,
    anchorRadius: style.anchorRadius * pixelRatio,
    snapAnchorRadius: style.snapAnchorRadius * pixelRatio,
    borderWidth: style.borderWidth * pixelRatio,
    borderEdgeWidth: style.borderEdgeWidth * pixelRatio,
    frontierWidth: style.frontierWidth * pixelRatio,
    coastWidth: style.coastWidth * pixelRatio,
    riverWidthMajor: style.riverWidthMajor * pixelRatio,
    riverWidthMinor: style.riverWidthMinor * pixelRatio,
  }
}
