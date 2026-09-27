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
}

/** The midpoint of a run, in lon/lat — where the far-side question is asked. */
function midpointOf(run: readonly number[], doc: YearDocument): [number, number] | null {
  const first = run[Math.floor(run.length / 2) - 1] ?? run[0]
  const second = run[Math.floor(run.length / 2)]
  if (first === undefined || second === undefined) return null
  const a = doc.anchors[first]
  const b = doc.anchors[second]
  if (a === undefined || b === undefined) return null
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
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

/** Apply the precedence: a run override, then a pair override, then the rule. */
function dressingFor(
  run: readonly number[],
  between: readonly string[],
  doc: YearDocument
): { hand: string | null; dressedBy: DerivedBorder['dressedBy'] } {
  const covering = doc.runs.find(
    (override) => override.hand !== null && override.run.some((index) => run.includes(index))
  )
  if (covering?.hand !== undefined && covering.hand !== null)
    return { hand: covering.hand, dressedBy: 'run' }

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
    ...dressingFor(run, between, doc),
  }
}

/** A run held by one owner: the far-side question, which is the half that costs something. */
function borderOfSingle(
  run: number[],
  owner: string,
  doc: YearDocument,
  byId: ReadonlyMap<string, YearPolity>,
  deps: DerivationDeps
): DerivedBorder | null {
  const point = midpointOf(run, doc)
  if (point === null) return null

  const far = farSideOf(owner, point, doc, byId)
  if (far !== null) {
    const between = [owner, far]
    return {
      run,
      between,
      ...relationBetween(owner, far, byId),
      ...dressingFor(run, between, doc),
    }
  }

  // Nothing claims the far side. Only the mask can say whether that is the sea or ground nobody took.
  const dry = deps.isLand?.(point[0], point[1]) ?? false
  return {
    run,
    between: [owner],
    relation: dry ? 'unclaimed' : 'coastline',
    degree: 0,
    ...dressingFor(run, [owner], doc),
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
    const border =
      owners.length >= 2
        ? borderOfShared(run, owners, doc, byId)
        : owner === undefined
          ? null
          : borderOfSingle(run, owner, doc, byId, deps)
    if (border !== null) out.push(border)
  }
  return out
}
