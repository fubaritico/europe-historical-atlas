/**
 * Every border of a document: its geometry, what it separates, and how it is dressed.
 *
 * Three questions, in order, and only the first is free:
 *
 * 1. **Who holds this run?** Counting owners — `borderGraph.ts`. Two is the peer case, named with nothing
 *    further asked.
 * 2. **If one, what holds the ground on the far side?** This is the half that costs something, and it was
 *    missing from the first version of the derivation until the dev's vassal case exposed it: a duchy drawn
 *    strictly inside the kingdom that holds it shares no anchor with it, so counting owners says "held by
 *    one path" and would have drawn a frontier against nothing across the middle of France. **Inclusion
 *    answers it** — whose claim encloses the midpoint — with the land mask telling sea from unclaimed
 *    ground.
 * 3. **What dresses it?** A run override beats a pair override beats the derived rule
 *    ([s13](../../../files/plans/cartographer/scenarii/s13-overrides.md)). The derivation is a default; the
 *    author's gesture is the law, and nothing here may recompute it away.
 */

import { pointInRings } from '../geo/pointInRing'

import { borderRunsOf } from './borderGraph'
import { coveringRun, stretchesBy } from './borderOverrides'
import { relationBetween } from './borderRelation'

import type { BorderRelation } from './borderRelation'
import type { YearDocument } from './yearDocument'
import type { YearPolity } from '../data/yearFormat'

/** One border, ready to draw. */
export interface DerivedBorder {
  /** The anchors it runs over, in order. Referenced, never copied — moving one moves this. */
  run: number[]
  /** Who it separates. One id when the far side is the sea or ground nobody claims. */
  between: string[]
  /** What they are to each other. */
  relation: BorderRelation
  /** How deep the line sits — what the weight follows. */
  degree: number
  /**
   * The stroke, after precedence: a run override, then a pair override, then `null` for the rule.
   *
   * `null` is not "no stroke": it means nobody overrode it, so the relation decides. Saying so explicitly
   * is what lets a renderer tell an authored solid line from a derived one.
   */
  hand: string | null
  /** Where the dressing came from, so `{Overrides}` can list it and `[Clear]` can undo it. */
  dressedBy: 'run' | 'pair' | 'rule'
}

/** What the far-side question needs from the world outside the document. */
export interface DerivationDeps {
  /**
   * Whether a coordinate is dry.
   *
   * Injected, exactly as `data/regionBorders` takes it: a claim's own geometry cannot tell unclaimed land
   * from open sea, and drawing a frontier across the Atlantic would double the coastline. Omit it and every
   * unowned far side is treated as sea, which draws nothing — the quiet choice, and the safe one.
   */
  isLand?: (lon: number, lat: number) => boolean
  /**
   * The sources whose anchors lie on the coastline itself — in practice the land mask's own source, the
   * one the Pen records for every vertex it takes from the coast.
   *
   * **Read before the mask, and it is exact where the mask is not**: a segment between two coast anchors
   * *is* coast, because the author snapped it there. Asked of the mask instead, a point stepped outward from
   * a narrow estuary lands on the far bank — dry — and the coast broke into a dozen two-anchor "unclaimed"
   * fragments on the 1100 France (the Gironde, the Loire, the Breton rias; measured 2026-10-13).
   */
  coastSources?: ReadonlySet<number>
}

/** Resolve a polity's rings into coordinates, for an inclusion test. */
function ringsOf(polityId: string, doc: YearDocument): [number, number][][] {
  const claim = doc.claims.find((existing) => existing.polity === polityId)
  if (claim === undefined) return []
  return claim.rings.map((ring) =>
    ring
      .map((index) => doc.anchors[index])
      .filter((anchor): anchor is [number, number] => anchor !== undefined)
  )
}

/**
 * Who holds the ground on the far side of a run held by one polity.
 *
 * **The deepest claim wins**, which is H-05a: a duchy inside a kingdom inside an empire has all three
 * enclosing its midpoint, and the one the line belongs to is the nearest — the most specific polity, the
 * same rule that decides who paints a cell.
 * @param owner - the polity holding the run
 * @param point - the run's midpoint
 * @param doc - the document
 * @param byId - every polity, by id
 * @returns the enclosing polity's id, or `null` when nothing claims it
 */
function farSideOf(
  owner: string,
  point: [number, number],
  doc: YearDocument,
  byId: ReadonlyMap<string, YearPolity>
): string | null {
  let best: string | null = null
  let bestDepth = -1
  for (const claim of doc.claims) {
    if (claim.polity === owner) continue
    if (!pointInRings(point, ringsOf(claim.polity, doc))) continue
    const depth = chainDepth(claim.polity, byId)
    if (depth > bestDepth) {
      best = claim.polity
      bestDepth = depth
    }
  }
  return best
}

/** How many links of homage sit above a polity. */
function chainDepth(id: string, byId: ReadonlyMap<string, YearPolity>): number {
  let depth = 0
  const seen = new Set<string>([id])
  let current = byId.get(id)?.suzerain ?? null
  while (current !== null && !seen.has(current)) {
    seen.add(current)
    depth += 1
    current = byId.get(current)?.suzerain ?? null
  }
  return depth
}

/**
 * The dressing a whole border takes before any run override: a pair override, then the rule. The run
 * overrides are applied afterwards, segment by segment (`splitByRunOverrides`).
 * @param between - who it separates
 * @param doc - the document, for its pair overrides
 * @returns the hand and where it came from
 */
function dressingFor(
  between: readonly string[],
  doc: YearDocument
): { hand: string | null; dressedBy: DerivedBorder['dressedBy'] } {
  if (between.length === 2) {
    const [a, b] = between
    const pair = doc.pairs.find(
      (override) =>
        override.hand !== null &&
        ((override.between[0] === a && override.between[1] === b) ||
          (override.between[0] === b && override.between[1] === a))
    )
    if (pair?.hand !== undefined && pair.hand !== null)
      return { hand: pair.hand, dressedBy: 'pair' }
  }
  return { hand: null, dressedBy: 'rule' }
}

/**
 * Cut a border where a run override begins and ends, and dress each covered stretch by its override.
 *
 * **Segment by segment, and that was a defect before** (2026-10-13): a run override dressed any derived
 * border sharing **one anchor** with it, so styling eleven segments of the Saône would have restyled the
 * whole 61-anchor France–Burgundy limit — where `s13` wants half a border bold and the other half not.
 * @param border - the border, dressed by its pair or its rule
 * @param doc - the document, for its run overrides
 * @returns the border, cut into stretches of one dressing each
 */
function splitByRunOverrides(border: DerivedBorder, doc: YearDocument): DerivedBorder[] {
  if (doc.runs.length === 0) return [border]
  const covers = border.run.slice(1).map((to, at) => coveringRun(doc, border.run[at] ?? -1, to))
  return stretchesBy(border.run, covers, (a, b) => a === b).map(({ run, label }) => {
    const override = doc.runs[label]
    return override !== undefined && override.hand !== null
      ? { ...border, run, hand: override.hand, dressedBy: 'run' as const }
      : { ...border, run }
  })
}

/** A run held by two or more owners: the peer case, and the three-owner case H-05a settles. */
function borderOfShared(
  run: number[],
  owners: readonly string[],
  doc: YearDocument,
  byId: ReadonlyMap<string, YearPolity>
): DerivedBorder | null {
  // Three or more owners is a vassal whose limit coincides with its lord's: the pair drawn is the two
  // deepest, which is the most specific statement the geometry supports.
  const ranked = [...owners].sort((a, b) => chainDepth(b, byId) - chainDepth(a, byId))
  const [first, second] = ranked
  if (first === undefined || second === undefined) return null
  const between = [first, second]
  return {
    run,
    between,
    ...relationBetween(first, second, byId),
    ...dressingFor(between, doc),
  }
}

/**
 * How far outside a segment its far side is asked, in degrees — about two land-mask cells. A segment of
 * coast lies **on** the mask's edge, where the cell under its midpoint is either; a step outward lands in
 * the water it borders, or the land.
 */
const FAR_SIDE_OFFSET_DEG = 0.05

/**
 * The point just outside a segment, on the side away from the owner's own ground.
 *
 * Both sides are tried and the one the owner does not enclose is kept, so the rings' winding never
 * matters. When neither or both are outside — a sliver narrower than the offset — the first is kept.
 * @param a - one end, lon/lat
 * @param b - the other
 * @param ownRings - the owner's rings, resolved
 * @returns the outward point
 */
function outsideOf(
  a: readonly [number, number],
  b: readonly [number, number],
  ownRings: [number, number][][]
): [number, number] {
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const length = Math.hypot(dx, dy)
  if (length === 0) return mid
  const nx = (-dy / length) * FAR_SIDE_OFFSET_DEG
  const ny = (dx / length) * FAR_SIDE_OFFSET_DEG
  const left: [number, number] = [mid[0] + nx, mid[1] + ny]
  const right: [number, number] = [mid[0] - nx, mid[1] - ny]
  return pointInRings(left, ownRings) && !pointInRings(right, ownRings) ? right : left
}

/**
 * Whether both ends of a segment were taken from the coastline.
 * @param a - one end's index
 * @param b - the other's
 * @param doc - the document, for each anchor's source
 * @param deps - which sources are the coast's
 * @returns `true` when the segment lies on the coast
 */
function onCoast(
  a: number | undefined,
  b: number | undefined,
  doc: YearDocument,
  deps: DerivationDeps
): boolean {
  const coast = deps.coastSources
  if (coast === undefined || a === undefined || b === undefined) return false
  const sa = doc.anchorSource[a]
  const sb = doc.anchorSource[b]
  return sa !== undefined && sb !== undefined && coast.has(sa) && coast.has(sb)
}

/** What lies beyond one segment of a single-owner run: a polity, or nothing — dry or wet. */
interface FarSide {
  /** The enclosing polity, or `null`. */
  far: string | null
  /** Whether the ground there is land, when nothing claims it. */
  dry: boolean
}

/**
 * A run held by one owner: the far-side question, which is the half that costs something.
 *
 * **Asked segment by segment, and the run cut where the answer changes** (2026-10-13). It was asked once,
 * at the run's midpoint — and a polity's whole outer limit is one run, so on the 1100 France its Atlantic
 * and Channel coasts and its land limit in Flanders came out as one 1 042-anchor "unclaimed" border: every
 * coast drawn as a frontier. Each segment is now judged just outside itself (`outsideOf`), and consecutive
 * segments with the same far side make one border.
 * @param run - the anchors, in order
 * @param owner - the polity holding them
 * @param doc - the document
 * @param byId - every polity, by id
 * @param deps - the land mask
 * @returns one border per stretch of one far side
 */
function bordersOfSingle(
  run: number[],
  owner: string,
  doc: YearDocument,
  byId: ReadonlyMap<string, YearPolity>,
  deps: DerivationDeps
): DerivedBorder[] {
  const ownRings = ringsOf(owner, doc)
  const sides = run
    .slice(1)
    .map((to, at) => segmentSide(run[at], to, owner, ownRings, doc, byId, deps))
  return stretchesBy(run, sides, sameSide).flatMap(({ run: stretch, label }) =>
    label === null ? [] : [borderOfStretch(stretch, owner, label, doc, byId)]
  )
}

/**
 * Whether two segments have the same far side, so they make one border.
 * @param a - one segment's far side
 * @param b - the next one's
 * @returns `true` when both are known and equal
 */
function sameSide(a: FarSide | null | undefined, b: FarSide | null | undefined): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false
  return a.far === b.far && a.dry === b.dry
}

/**
 * What lies beyond one segment: the coast when both ends were taken from it, else whoever encloses the
 * point just outside it, else what the mask says of that point.
 * @param from - the segment's first anchor
 * @param to - its second
 * @param owner - the polity holding it
 * @param ownRings - the owner's rings, resolved
 * @param doc - the document
 * @param byId - every polity, by id
 * @param deps - the land mask and the coast's sources
 * @returns the far side, or `null` when an anchor is missing
 */
function segmentSide(
  from: number | undefined,
  to: number,
  owner: string,
  ownRings: [number, number][][],
  doc: YearDocument,
  byId: ReadonlyMap<string, YearPolity>,
  deps: DerivationDeps
): FarSide | null {
  const a = from === undefined ? undefined : doc.anchors[from]
  const b = doc.anchors[to]
  if (a === undefined || b === undefined) return null
  const point = outsideOf(a, b, ownRings)
  const far = farSideOf(owner, point, doc, byId)
  if (far === null && onCoast(from, to, doc, deps)) return { far: null, dry: false }
  // Nothing claims the far side: only the mask can say whether that is the sea or ground nobody took.
  return { far, dry: far === null && (deps.isLand?.(point[0], point[1]) ?? false) }
}

/**
 * One stretch of a single-owner run, all of one far side.
 * @param run - its anchors
 * @param owner - the polity holding it
 * @param side - what lies beyond it
 * @param doc - the document
 * @param byId - every polity, by id
 * @returns the border
 */
function borderOfStretch(
  run: number[],
  owner: string,
  side: FarSide,
  doc: YearDocument,
  byId: ReadonlyMap<string, YearPolity>
): DerivedBorder {
  if (side.far !== null) {
    const between = [owner, side.far]
    return {
      run,
      between,
      ...relationBetween(owner, side.far, byId),
      ...dressingFor(between, doc),
    }
  }
  return {
    run,
    between: [owner],
    relation: side.dry ? 'unclaimed' : 'coastline',
    degree: 0,
    ...dressingFor([owner], doc),
  }
}

/**
 * Derive every border of a document.
 *
 * A coastline is returned like any other stretch, with `relation: 'coastline'`, rather than dropped: the
 * caller decides whether to draw it, and the atlas already draws its own from the land mask. Saying it is a
 * coastline is more useful than silently omitting it, because an omission cannot be told from a bug.
 * @param doc - the document to derive from
 * @param deps - what the far-side question needs
 * @returns one entry per border stretch
 */
export function deriveBorders(doc: YearDocument, deps: DerivationDeps = {}): DerivedBorder[] {
  const byId = new Map(doc.polities.map((polity) => [polity.id, polity]))
  const out: DerivedBorder[] = []
  for (const { run, owners } of borderRunsOf(doc)) {
    const owner = owners[0]
    if (owners.length >= 2) {
      const border = borderOfShared(run, owners, doc, byId)
      if (border !== null) out.push(border)
    } else if (owner !== undefined) out.push(...bordersOfSingle(run, owner, doc, byId, deps))
  }
  return out.flatMap((border) => splitByRunOverrides(border, doc))
}
