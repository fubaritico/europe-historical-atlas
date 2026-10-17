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

import { latitudeToVertical, longitudeToHorizontal } from '../geo/mercator'
import { indexRings, pointInIndexedRings } from '../geo/pointInRing'

import { borderRunsOf } from './borderGraph'
import { coveringRun, stretchesBy } from './borderOverrides'
import { relationBetween } from './borderRelation'
import { parseProvenance } from './provenance'

import type { BorderRelation } from './borderRelation'
import type { YearDocument } from './yearDocument'
import type { LandMask } from '../data/landMask'
import type { YearPolity } from '../data/yearFormat'
import type { RingIndex } from '../geo/pointInRing'

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
   * **Read before inclusion and the mask, and it is exact where they are not**: a segment between two coast anchors
   * *is* coast, because the author snapped it there. Asked of the mask instead, a point stepped outward from
   * a narrow estuary lands on the far bank — dry — and the coast broke into a dozen two-anchor "unclaimed"
   * fragments on the 1100 France (the Gironde, the Loire, the Breton rias; measured 2026-10-13).
   */
  coastSources?: ReadonlySet<number>
}

/**
 * The document's sources whose anchors lie on the coastline — the land mask's own source, recorded by the
 * Cartographer under the name {@link parseProvenance} reads from it.
 *
 * **None, for a mask whose source names no licence** — the atlas's elevation threshold is one. The
 * Cartographer refuses to record an anchor under such a source, so no anchor can be coast by it: the exact
 * answer, not a substitute for one. The mask alone then tells coast from frontier.
 * @param doc - the document
 * @param maskSource - the land mask's source sentence, *"Natural Earth 10m land minus lakes (public domain)"*
 * @returns the coast's source ids
 */
export function coastSourceIds(doc: YearDocument, maskSource: string): Set<number> {
  const provenance = parseProvenance(maskSource)
  if (provenance === null) return new Set()
  return new Set(
    doc.sources.filter((source) => source.name === provenance.name).map((source) => source.id)
  )
}

/**
 * What the far-side question asks of a land mask, wired once for both applications — so the Cartographer's
 * view of a border and the atlas's drawing of it cannot disagree on what is dry or what is coast.
 * @param doc - the document
 * @param mask - which cells are dry
 * @returns the derivation's dependencies
 */
export function maskDerivationDeps(doc: YearDocument, mask: LandMask): DerivationDeps {
  return {
    isLand: (lon, lat) =>
      mask.isLand(
        longitudeToHorizontal(lon, mask.meta.bbox),
        latitudeToVertical(lat, mask.meta.bbox)
      ),
    coastSources: coastSourceIds(doc, mask.meta.source),
  }
}

/** One claim resolved for inclusion tests: its rings in coordinates, and the box around them. */
interface ResolvedClaim {
  /** Whose claim. */
  polity: string
  /** Its rings, as `[lon, lat]`. */
  rings: [number, number][][]
  /** The box around every ring: a point outside it is outside the claim, with no ring walked. */
  box: { west: number; east: number; south: number; north: number }
  /** Its rings indexed for the far-side tests, built once per derivation (CARTO-240). */
  index: RingIndex
}

/** The index of a polity holding no ring: every point is outside it. */
const NO_RINGS: RingIndex = indexRings([])

/**
 * Every claim resolved once, for a whole derivation.
 *
 * **Once, not per segment — the defect of 2026-10-14**: the far side of each segment of a single-owner run
 * resolved every claim's rings afresh and walked all of them, so a derivation grew with segments × anchors.
 * On the 137 polities of 1100 it took 5.7 s, and the Cartographer paid it after every gesture. Resolved
 * here, and skipped by their box, the answer is the same and the cost is the segments.
 * @param doc - the document
 * @returns each claim's rings, box and index, by polity id
 */
function resolveClaims(doc: YearDocument): Map<string, ResolvedClaim> {
  const resolved = new Map<string, ResolvedClaim>()
  for (const claim of doc.claims) {
    const rings = claim.rings.map((ring) =>
      ring
        .map((index) => doc.anchors[index])
        .filter((anchor): anchor is [number, number] => anchor !== undefined)
    )
    const box = { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity }
    for (const ring of rings) {
      for (const [lon, lat] of ring) {
        box.west = Math.min(box.west, lon)
        box.east = Math.max(box.east, lon)
        box.south = Math.min(box.south, lat)
        box.north = Math.max(box.north, lat)
      }
    }
    resolved.set(claim.polity, { polity: claim.polity, rings, box, index: indexRings(rings) })
  }
  return resolved
}

/**
 * Whether a point lies inside a resolved claim — its box first, then its rings.
 * @param point - `[lon, lat]`
 * @param claim - the claim, resolved
 * @returns `true` when one of its rings encloses the point
 */
function encloses(point: readonly [number, number], claim: ResolvedClaim): boolean {
  const { box } = claim
  if (point[0] < box.west || point[0] > box.east || point[1] < box.south || point[1] > box.north) {
    return false
  }
  return pointInIndexedRings(point, claim.index)
}

/**
 * Who holds the ground on the far side of a run held by one polity.
 *
 * **The deepest claim wins**, which is H-05a: a duchy inside a kingdom inside an empire has all three
 * enclosing its midpoint, and the one the line belongs to is the nearest — the most specific polity, the
 * same rule that decides who paints a cell.
 * @param owner - the polity holding the run
 * @param point - the run's midpoint
 * @param claims - every claim, resolved once for the derivation
 * @param byId - every polity, by id
 * @returns the enclosing polity's id, or `null` when nothing claims it
 */
function farSideOf(
  owner: string,
  point: [number, number],
  claims: ReadonlyMap<string, ResolvedClaim>,
  byId: ReadonlyMap<string, YearPolity>
): string | null {
  let best: string | null = null
  let bestDepth = -1
  for (const claim of claims.values()) {
    if (claim.polity === owner) continue
    if (!encloses(point, claim)) continue
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

/** Who holds the ground on each side of one segment of a shared run. */
interface Sides {
  /** The owners whose rings hold the ground on one side. */
  left: string[]
  /** The owners whose rings hold the ground on the other. */
  right: string[]
}

/**
 * Who of a run's owners actually holds ground on each side of one of its segments (H-44, 2026-10-15).
 *
 * Holding a segment's anchors is not holding ground beside it: an outline can run along a neighbour's limit
 * with **no width** — a domain cleared by hand from under a vassal leaves such a path — or two outlines can
 * hold the same coast from the same side. Counting them as owners drew the Empire against Bohemia, dotted,
 * on Bohemia's frontier with unclaimed ground. An owner holding neither side is not on the limit at all.
 * @param a - the segment's first anchor, `[lon, lat]`
 * @param b - its second
 * @param owners - who holds the run
 * @param claims - every claim, resolved once for the derivation
 * @returns each side's holders, or `null` for a segment of no length
 */
function sidesOf(
  a: [number, number] | undefined,
  b: [number, number] | undefined,
  owners: readonly string[],
  claims: ReadonlyMap<string, ResolvedClaim>
): Sides | null {
  if (a === undefined || b === undefined) return null
  if (a[0] === b[0] && a[1] === b[1]) return null
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const nx = -(b[1] - a[1]) * SIDE_STEP
  const ny = (b[0] - a[0]) * SIDE_STEP
  const holds = (owner: string, point: [number, number]): boolean => {
    const claim = claims.get(owner)
    return claim !== undefined && encloses(point, claim)
  }
  return {
    left: owners.filter((owner) => holds(owner, [mid[0] + nx, mid[1] + ny])),
    right: owners.filter((owner) => holds(owner, [mid[0] - nx, mid[1] - ny])),
  }
}

/** How far either side of a segment its sides are asked, as a fraction of its length. */
const SIDE_STEP = 1e-3

/**
 * The deepest of some polities in the chain of homage — the most specific; the first on a tie.
 * @param ids - the polities
 * @param byId - every polity, by id
 * @returns the deepest, or `undefined` for none
 */
function deepest(
  ids: readonly string[],
  byId: ReadonlyMap<string, YearPolity>
): string | undefined {
  return [...ids].sort((x, y) => chainDepth(y, byId) - chainDepth(x, byId))[0]
}

/** How one segment of a shared run is judged: a limit between two, one holder's, or the owners as counted. */
type SharedLabel =
  | { kind: 'pair'; one: string; other: string }
  | { kind: 'single'; holder: string }
  | { kind: 'counted' }

/**
 * Whether two segments are judged alike, so they make one border.
 * @param x - one segment's judgement
 * @param y - the next one's
 * @returns `true` when they name the same polities the same way
 */
function sameLabel(x: SharedLabel, y: SharedLabel): boolean {
  if (x.kind === 'pair' && y.kind === 'pair') return x.one === y.one && x.other === y.other
  if (x.kind === 'single' && y.kind === 'single') return x.holder === y.holder
  return x.kind === 'counted' && y.kind === 'counted'
}

/**
 * Judge one segment of a shared run by who holds the ground on each side.
 * @param a - the segment's first anchor
 * @param b - its second
 * @param owners - who holds the run
 * @param derivation - the polities and the claims resolved
 * @returns the judgement
 */
function labelOf(
  a: number | undefined,
  b: number,
  owners: readonly string[],
  derivation: Derivation
): SharedLabel {
  const { doc, byId, claims } = derivation
  const sides = sidesOf(
    a === undefined ? undefined : doc.anchors[a],
    doc.anchors[b],
    owners,
    claims
  )
  if (sides === null) return { kind: 'counted' }
  const one = deepest(sides.left, byId)
  const other = deepest(sides.right, byId)
  if (one !== undefined && other !== undefined && one !== other) return { kind: 'pair', one, other }
  const holder = one ?? other
  return holder === undefined ? { kind: 'counted' } : { kind: 'single', holder }
}

/**
 * The borders of a run held by two or more owners, judged segment by segment by who holds the ground on
 * each side, and cut where the judgement changes.
 *
 * Both sides held: the deepest on one side against the deepest on the other — Bohemia | Poland is
 * sovereign, Normandy | France the vassal hand. One side held: no limit between them, so the stretch is
 * asked what lies beyond, as a run held by one (the coast, unclaimed ground, a neighbour). Neither side, or
 * a segment of no length: the owners as counted, the deepest two.
 * @param run - the anchors, in order
 * @param owners - who holds them
 * @param derivation - the document, the polities, the claims resolved and the mask
 * @returns the borders
 */
function bordersOfShared(
  run: number[],
  owners: readonly string[],
  derivation: Derivation
): DerivedBorder[] {
  const { doc, byId } = derivation
  const labels = run.slice(1).map((to, at) => labelOf(run[at], to, owners, derivation))
  return stretchesBy(run, labels, sameLabel).flatMap(({ run: stretch, label }) => {
    if (label.kind === 'pair') return [borderOfPair(stretch, label.one, label.other, doc, byId)]
    if (label.kind === 'single') return bordersOfSingle(stretch, label.holder, derivation)
    const [first, second] = [...owners].sort((x, y) => chainDepth(y, byId) - chainDepth(x, byId))
    return first === undefined || second === undefined
      ? []
      : [borderOfPair(stretch, first, second, doc, byId)]
  })
}

/**
 * A border between two polities over a run.
 * @param run - the anchors, in order
 * @param first - one side
 * @param second - the other
 * @param doc - the document, for its pair overrides
 * @param byId - every polity, by id
 * @returns the border, its relation read off the chain of homage
 */
function borderOfPair(
  run: number[],
  first: string,
  second: string,
  doc: YearDocument,
  byId: ReadonlyMap<string, YearPolity>
): DerivedBorder {
  const between = [first, second]
  return { run, between, ...relationBetween(first, second, byId), ...dressingFor(between, doc) }
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
 * @param own - the owner's rings, indexed
 * @returns the outward point
 */
function outsideOf(
  a: readonly [number, number],
  b: readonly [number, number],
  own: RingIndex
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
  return pointInIndexedRings(left, own) && !pointInIndexedRings(right, own) ? right : left
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

/** What a derivation reads, gathered once: the document, the polities by id, the claims resolved, the mask. */
interface Derivation {
  /** The document. */
  doc: YearDocument
  /** Every polity, by id. */
  byId: ReadonlyMap<string, YearPolity>
  /** Every claim's rings and box, by polity id. */
  claims: ReadonlyMap<string, ResolvedClaim>
  /** The land mask and the coast's sources. */
  deps: DerivationDeps
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
 * @param derivation - the document, the polities, the claims resolved and the mask
 * @returns one border per stretch of one far side
 */
function bordersOfSingle(run: number[], owner: string, derivation: Derivation): DerivedBorder[] {
  const own = derivation.claims.get(owner)?.index ?? NO_RINGS
  const sides = run.slice(1).map((to, at) => segmentSide(run[at], to, owner, own, derivation))
  return stretchesBy(run, sides, sameSide).flatMap(({ run: stretch, label }) =>
    label === null ? [] : [borderOfStretch(stretch, owner, label, derivation.doc, derivation.byId)]
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
 * @param own - the owner's rings, indexed
 * @param derivation - the document, the polities, the claims resolved and the mask
 * @returns the far side, or `null` when an anchor is missing
 */
function segmentSide(
  from: number | undefined,
  to: number,
  owner: string,
  own: RingIndex,
  derivation: Derivation
): FarSide | null {
  const { doc, deps } = derivation
  const a = from === undefined ? undefined : doc.anchors[from]
  const b = doc.anchors[to]
  if (a === undefined || b === undefined) return null
  // The coast is asked first: the author snapped both ends to it, so water lies beyond, however narrow.
  // Asked after inclusion (2026-10-15), the step outward crossed the Velebit channel into Venice's islands.
  if (onCoast(from, to, doc, deps)) return { far: null, dry: false }
  const point = outsideOf(a, b, own)
  const far = farSideOf(owner, point, derivation.claims, derivation.byId)
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
  const derivation: Derivation = { doc, byId, claims: resolveClaims(doc), deps }
  const out: DerivedBorder[] = []
  for (const { run, owners } of borderRunsOf(doc)) {
    const owner = owners[0]
    if (owners.length >= 2) out.push(...bordersOfShared(run, owners, derivation))
    else if (owner !== undefined) out.push(...bordersOfSingle(run, owner, derivation))
  }
  return out.flatMap((border) => splitByRunOverrides(border, doc))
}
