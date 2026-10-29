import { latitudeToVertical, longitudeToHorizontal } from '../geo/mercator'

import { handFor } from './borderHands'
import { claimEnclosure, deriveBorders, maskDerivationDeps } from './derivedBorders'
import { homageLevels } from './homageLevels'
import { asSeenAcrossTribes, isTribeEdge, tribeIds } from './tribes'
import { openYearDocument } from './yearDocument'

import type { HandPattern } from './borderHands'
import type { DerivedBorder } from './derivedBorders'
import type { HomageLevels } from './homageLevels'
import type { YearDocument } from './yearDocument'
import type { BorderPattern } from '../data/borderStyles'
import type { UvPoint } from '../data/coastlineSource'
import type { LandMask } from '../data/landMask'
import type { RegionBorders } from '../data/regionBorders'
import type { AuthoredYear } from '../data/yearFormat'
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
 * **A tribe has no borders of its own** — as in the Cartographer (`tribes.ts`): a border between two tribes,
 * or between a tribe and the sea or ground nobody claims, is left out; one between a tribe and a state is the
 * state's, drawn like any other, its split level read as for any pair. Its limit is drawn by its own colour fading out (`tribeFeather`, ATLAS-258), from the region's
 * rings the atlas already holds; nothing of it comes back from here.
 *
 * **Each group carries its split level** (`homageLevels`, ATLAS-253): the first display level at which its
 * two sides wear different colours, so the atlas can hide a border between a vassal and its suzerain
 * until the zoom shows the vassal apart. The frontier against unclaimed ground has one side only and is
 * level 0, shown at every zoom; so is a border with a tribe on one side, whose colour never changes with
 * the zoom.
 */

/** An authored year's borders, and the pattern each group is drawn in. */
export interface ExactBorders {
  /** The lines, in grid coordinates — the frontier against unclaimed ground apart, as the atlas draws it. */
  borders: RegionBorders
  /** The pattern of each group, keyed by its pair as `"a:b"`. */
  patterns: ReadonlyMap<string, BorderPattern>
  /** The split level of each group, keyed by its pair as `"a:b"` — `0` shows it at every zoom. */
  levels: ReadonlyMap<string, number>
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
 * How far beside a frontier its two sides are asked, in degrees — about two land-mask cells, as the derivation asks a
 * run's far side (`derivedBorders`).
 */
const SIDE_OFFSET_DEG = 0.05

/**
 * Whether the polity a frontier bounds lies on the left of its run, north up — tried at the run's middle segment. A
 * sliver narrower than the offset, where neither or both sides are its, is left as it runs.
 * @param run - the frontier's anchors, in order
 * @param owner - the polity it bounds
 * @param doc - the document, for the anchors
 * @param holds - whether a polity's claim encloses a point
 * @returns `false` only when the polity is clearly on the right
 */
function heldOnTheLeft(
  run: readonly number[],
  owner: string,
  doc: YearDocument,
  holds: (polity: string, point: readonly [number, number]) => boolean
): boolean {
  const middle = Math.max(0, Math.floor((run.length - 2) / 2))
  // Every index resolves (`assembleAuthoredYear` refused the year otherwise), and a run has two anchors at least.
  const a = doc.anchors[run[middle] ?? -1]
  const b = doc.anchors[run[middle + 1] ?? -1]
  if (a === undefined || b === undefined) return true
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const length = Math.hypot(dx, dy)
  if (length === 0) return true
  const [nx, ny] = [(-dy / length) * SIDE_OFFSET_DEG, (dx / length) * SIDE_OFFSET_DEG]
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const left = holds(owner, [mid[0] + nx, mid[1] + ny])
  const right = holds(owner, [mid[0] - nx, mid[1] - ny])
  return !(right && !left)
}

/**
 * A frontier's run with its polity on the left, north up — reversed when the polity is on the right.
 * @param run - the frontier's anchors, in order
 * @param owner - the polity it bounds, as the border names it
 * @param doc - the document, for the anchors
 * @param holds - whether a polity's claim encloses a point
 * @returns the run, oriented
 */
function leftHanded(
  run: number[],
  owner: string | undefined,
  doc: YearDocument,
  holds: (polity: string, point: readonly [number, number]) => boolean
): number[] {
  // A frontier always names its one polity; without it, the run stays as it was derived.
  if (owner === undefined || heldOnTheLeft(run, owner, doc, holds)) return run
  return [...run].reverse()
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
 * @param homage - the year's homage read as levels — passed in by a caller that reads it for the fills too,
 *   so a loop of homage is said once per year rather than once per use
 * @returns the lines, their patterns and their split levels
 */
export function exactBordersOf(
  authored: AuthoredYear,
  bbox: GeoBounds,
  mask: LandMask | null,
  warn: (message: string) => void = (message) => {
    console.warn(message)
  },
  homage: HomageLevels = homageLevels(authored.registry.polities)
): ExactBorders {
  const doc = openYearDocument(authored)
  const derived = deriveBorders(doc, mask === null ? {} : maskDerivationDeps(doc, mask))
  const tribes = tribeIds(doc.polities)
  const borders: RegionBorders = { between: [], frontier: [] }
  const patterns = new Map<string, BorderPattern>()
  const levels = new Map<string, number>()
  // Every index resolves: `assembleAuthoredYear` refused the year if one pointed past the table.
  const toGrid = (indices: readonly number[]): UvPoint[] =>
    indices
      .map((index) => doc.anchors[index])
      .filter((anchor): anchor is [number, number] => anchor !== undefined)
      .map(([lon, lat]) => ({
        u: longitudeToHorizontal(lon, bbox),
        v: latitudeToVertical(lat, bbox),
      }))
  const holds = claimEnclosure(doc)
  let undrawnHands = 0
  for (const border of derived) {
    if (isTribeEdge(border, tribes)) continue
    // Across a tribe a state shows its frontier, never a border between two states.
    const seen = asSeenAcrossTribes(border, tribes)
    const hand = handFor(seen, warn)
    if (hand.pattern === 'none') continue
    const line = toGrid(border.run)
    if (line.length < 2) continue
    if (!hand.cased) {
      if (seen.hand !== null) undrawnHands += 1
      // The polity a frontier bounds: its one side, or across a tribe the side that is not one.
      const owner = seen.between.find((id) => !tribes.has(id))
      borders.frontier.push(toGrid(leftHanded(border.run, owner, doc, holds)))
      continue
    }
    const key = borders.between.length
    borders.between.push({ pair: [key, key], lines: [line] })
    patterns.set(pairKey([key, key]), ATLAS_PATTERN[hand.pattern])
    levels.set(pairKey([key, key]), splitLevelOf(border, homage))
  }
  warnUndrawnHands(undrawnHands, warn)
  return { borders, patterns, levels }
}

/**
 * Say, once per derivation, how many frontier stretches carry a hand the atlas cannot draw there.
 * @param count - how many
 * @param warn - where it is said
 * @returns nothing; silent for none
 */
function warnUndrawnHands(count: number, warn: (message: string) => void): void {
  if (count > 0)
    warn(
      `[atlas] ${String(count)} frontier stretch(es) carry an authored hand the atlas draws as its frontier stroke.`
    )
}

/**
 * The split level of a derived border: the first display level at which its two sides wear different
 * colours.
 *
 * A border touching a tribe never reaches here: across a tribe a state shows its frontier
 * (`asSeenAcrossTribes`), which every zoom draws — the tribe layer wears the tribe's own colour at every
 * zoom, so nothing may hide that line (ARCH-001, 2026-10-18).
 * @param border - the border, naming who it separates
 * @param homage - the year's homage
 * @returns `0` for a border with one side — the sea or ground nobody claims beyond it — else the pair's
 *   split level
 */
function splitLevelOf(border: Pick<DerivedBorder, 'between'>, homage: HomageLevels): number {
  const [one, other] = border.between
  if (one === undefined || other === undefined) return 0
  return homage.splitLevel(one, other)
}

/**
 * The key a group's pattern is filed under.
 * @param pair - the group's two indices
 * @returns `"a:b"`
 */
export function pairKey(pair: readonly [number, number]): string {
  return `${String(pair[0])}:${String(pair[1])}`
}
