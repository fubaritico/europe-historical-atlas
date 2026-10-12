import type { River } from './riverSource'

/**
 * How the rivers look, the one definition the atlas and the Cartographer both read.
 *
 * **Why it lives in `core`, beside the data.** The dev's call, 2026-10-12: *"si ça affiche exactement la
 * même chose que dans l'application […] et qu'on a un fonctionnement cohérent, moi, ça me va."* Two
 * applications drawing the same rivers from two sets of numbers is the drift this repository keeps paying
 * for; one module both import cannot drift. `regionPalette.ts` is the precedent: presentation values that
 * two renderers must agree on, kept with the data they dress.
 *
 * What is **not** shared, on purpose: the atlas reveals the minor ranks as the camera comes in, and the
 * Cartographer does not hide them while its tools act — the Pen must snap only to what is drawn, and a
 * tributary hidden yet snappable would pull points onto an invisible line.
 */

/** The ink the whole map is drawn in — the coastline's sepia, so one hand drew both. */
export const MAP_INK = '#4a3424'

/** The river layer's look, as both applications open it. */
export interface RiverDisplay {
  /** The ink, a `#rrggbb` hex. */
  ink: string
  /** The layer's opacity, 0 to 1. */
  opacity: number
  /** Stroke width of a major river (rank 1), in CSS pixels. */
  widthMajor: number
  /** Stroke width of the finest tributaries (rank 9), in CSS pixels. */
  widthMinor: number
  /** Whether the paths traced through lakes are drawn — they are not rivers anyone follows on a map. */
  includeLakeCenterlines: boolean
}

/** The rivers as both applications draw them by default. The atlas's dev panel may still tune its own. */
export const RIVER_DISPLAY: RiverDisplay = {
  ink: MAP_INK,
  opacity: 0.3,
  widthMajor: 1.25,
  widthMinor: 0.95,
  includeLakeCenterlines: false,
}

/** The `scalerank` range Natural Earth uses: 1 = major, 9 = minor. */
export const RIVER_MIN_RANK = 1
/** The finest rank Natural Earth gives. */
export const RIVER_MAX_RANK = 9

/**
 * A rank as both applications read it: rounded to a whole rank and held within 1…9. One rule, so a
 * fractional or out-of-range rank gets the same width in the atlas and the Cartographer (ARCH-102).
 * @param rank - the Natural Earth `scalerank` as the dataset gives it
 * @returns a whole rank in 1…9
 */
export function wholeRiverRank(rank: number): number {
  return Math.min(RIVER_MAX_RANK, Math.max(RIVER_MIN_RANK, Math.round(rank)))
}

/** Natural Earth's feature class for a path traced through a lake. */
export const LAKE_CENTERLINE_KIND = 'Lake Centerline'

/**
 * The stroke width of a rank, interpolated from `widthMajor` at rank 1 down to `widthMinor` at rank 9.
 * A width hierarchy is how a river network reads as a hierarchy at all: drawn at one weight, a trunk and a
 * third-order tributary are indistinguishable.
 * @param rank - the Natural Earth `scalerank`; rounded and clamped to 1…9 (`wholeRiverRank`)
 * @param widths - the two ends of the scale
 * @returns the width in CSS pixels
 */
export function riverRankWidth(
  rank: number,
  widths: Pick<RiverDisplay, 'widthMajor' | 'widthMinor'>
): number {
  const t = (wholeRiverRank(rank) - RIVER_MIN_RANK) / (RIVER_MAX_RANK - RIVER_MIN_RANK)
  return widths.widthMajor + (widths.widthMinor - widths.widthMajor) * t
}

/**
 * Whether a centreline is drawn at all — the lake-centerline rule, in one place.
 * @param river - the centreline, or anything carrying its feature class
 * @param includeLakeCenterlines - whether the paths through lakes are kept
 * @returns `true` when it is drawn
 */
export function isDrawnRiver(river: Pick<River, 'kind'>, includeLakeCenterlines: boolean): boolean {
  return includeLakeCenterlines || river.kind !== LAKE_CENTERLINE_KIND
}

/**
 * The ink as a CSS colour with the layer's opacity — what a 2D canvas strokes with.
 * @param display - the ink and the opacity
 * @returns an `rgba(…)` string
 * @throws when the ink is not a `#rrggbb` hex, which would otherwise stroke in an unchosen colour
 */
export function riverStrokeCss(display: Pick<RiverDisplay, 'ink' | 'opacity'>): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(display.ink)
  if (match === null) throw new Error(`river ink "${display.ink}" is not a #rrggbb hex`)
  const [, r = '0', g = '0', b = '0'] = match
  return `rgba(${String(parseInt(r, 16))}, ${String(parseInt(g, 16))}, ${String(parseInt(b, 16))}, ${String(display.opacity)})`
}
