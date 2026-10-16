import { latitudeToVertical, longitudeToHorizontal } from '../geo/mercator'

import { handFor } from './borderHands'
import { deriveBorders, maskDerivationDeps } from './derivedBorders'
import { touchesTribe, tribeIds } from './tribes'
import { openYearDocument } from './yearDocument'

import type { HandPattern } from './borderHands'
import type { BorderPattern } from '../data/borderStyles'
import type { UvPoint } from '../data/coastlineSource'
import type { LandMask } from '../data/landMask'
import type { RegionBorders } from '../data/regionBorders'
import type { AuthoredYear, YearClaim } from '../data/yearFormat'
import type { GeoBounds } from '../geo/mercator'

/**
 * An authored year's borders as the atlas draws them — exact, from the anchors the Cartographer shares,
 * each in its hand and with its author's overrides (D1 of `files/plans/borders/plan.md`, the dev's call of
 * 2026-10-13: *"l'atlas dessine les frontières exactes depuis les ancres"*).
 *
 * **In the atlas's own shape**, `RegionBorders` in grid coordinates, so its line layers draw them unchanged.
 * Each border is its own group, under a pair of indices of its own: the atlas looks a pattern up by pair,
 * and here the pattern is the border's hand, not a name rule.
 *
 * **No smoothing** — the dev's D3: the line goes through the anchors, so a city sitting in a bend is on the
 * side the author put it.
 *
 * **What the atlas does not draw yet, said here and at run time**: a hand's **weight** — the atlas's widths
 * being one per kind of line — and an authored hand on a **frontier**, which the atlas draws in its one dark
 * stroke whatever the author chose. The latter is warned once per derivation.
 *
 * **A tribe has no borders, its dashed outline instead** — as in the Cartographer (`tribes.ts`): a border
 * with a tribe on either side is left out, and each tribe's rings come back apart, for the atlas to stroke
 * dashed in its colour.
 */

/** An authored year's borders, and the pattern each group is drawn in. */
export interface ExactBorders {
  /** The lines, in grid coordinates — the frontier against unclaimed ground apart, as the atlas draws it. */
  borders: RegionBorders
  /** The pattern of each group, keyed by its pair as `"a:b"`. */
  patterns: ReadonlyMap<string, BorderPattern>
  /** Each tribe's claim, its rings closed, in grid coordinates — stroked dashed instead of bordered. */
  tribeOutlines: { polity: string; rings: UvPoint[][] }[]
}

/**
 * The atlas's pattern for a hand. The atlas draws three; a dotted hand reads as dashed there until it has
 * a dot of its own — the one approximation of this file, said here rather than hidden.
 */
const ATLAS_PATTERN: Readonly<Record<Exclude<HandPattern, 'none'>, BorderPattern>> = {
  solid: 'solid',
  dotted: 'dashed',
  dashed: 'dashed',
  double: 'double',
}

/**
 * Derive an authored year's borders for the atlas.
 *
 * **Without a land mask, no frontier against unclaimed ground** — every far side nobody claims is read as
 * sea. The same answer the raster derivation gives when the mask failed, so the atlas's declared degraded
 * mode (its notice already posted) covers both kinds of year alike.
 * @param authored - the year's three files
 * @param bbox - the frame the anchors are projected against — the manifest's, which is the DEM's
 * @param mask - which cells are dry, or `null` when the asset failed
 * @param warn - where a hand the atlas cannot draw is said; the console in the application
 * @returns the lines and their patterns
 */
export function exactBordersOf(
  authored: AuthoredYear,
  bbox: GeoBounds,
  mask: LandMask | null,
  warn: (message: string) => void = (message) => {
    console.warn(message)
  }
): ExactBorders {
  const doc = openYearDocument(authored)
  const derived = deriveBorders(doc, mask === null ? {} : maskDerivationDeps(doc, mask))
  const tribes = tribeIds(doc.polities)
  const borders: RegionBorders = { between: [], frontier: [] }
  const patterns = new Map<string, BorderPattern>()
  // Every index resolves: `assembleAuthoredYear` refused the year if one pointed past the table.
  const toGrid = (indices: readonly number[]): UvPoint[] =>
    indices
      .map((index) => doc.anchors[index])
      .filter((anchor): anchor is [number, number] => anchor !== undefined)
      .map(([lon, lat]) => ({
        u: longitudeToHorizontal(lon, bbox),
        v: latitudeToVertical(lat, bbox),
      }))
  let undrawnHands = 0
  for (const border of derived) {
    if (touchesTribe(border, tribes)) continue
    const hand = handFor(border, warn)
    if (hand.pattern === 'none') continue
    const line = toGrid(border.run)
    if (line.length < 2) continue
    if (!hand.cased) {
      if (border.hand !== null) undrawnHands += 1
      borders.frontier.push(line)
      continue
    }
    const key = borders.between.length
    borders.between.push({ pair: [key, key], lines: [line] })
    patterns.set(pairKey([key, key]), ATLAS_PATTERN[hand.pattern])
  }
  if (undrawnHands > 0)
    warn(
      `[atlas] ${String(undrawnHands)} frontier stretch(es) carry an authored hand the atlas draws as its frontier stroke.`
    )
  return { borders, patterns, tribeOutlines: tribeOutlinesOf(doc.claims, tribes, toGrid) }
}

/**
 * Each tribe's claim, its rings closed and in grid coordinates.
 * @param claims - the year's claims
 * @param tribes - the ids of its tribes
 * @param toGrid - anchor indices to grid points
 * @returns one outline per claim of a tribe
 */
function tribeOutlinesOf(
  claims: readonly YearClaim[],
  tribes: ReadonlySet<string>,
  toGrid: (indices: readonly number[]) => UvPoint[]
): ExactBorders['tribeOutlines'] {
  return claims
    .filter((claim) => tribes.has(claim.polity))
    .map((claim) => ({
      polity: claim.polity,
      // Closed, so the stroke goes all the way round: a ring's closure is implied in the format.
      rings: claim.rings.flatMap((indices) => {
        const ring = toGrid(indices)
        const first = ring[0]
        return first !== undefined && ring.length >= 3 ? [[...ring, first]] : []
      }),
    }))
}

/**
 * The key a group's pattern is filed under.
 * @param pair - the group's two indices
 * @returns `"a:b"`
 */
export function pairKey(pair: readonly [number, number]): string {
  return `${String(pair[0])}:${String(pair[1])}`
}
