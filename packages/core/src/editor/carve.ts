/**
 * Carving a vassal's new outline out of its suzerain's own domain (the dev, 2026-10-15, `s08` *"A new vassal
 * carves its ground out of its suzerain"*).
 *
 * Every outline closed for a vassal takes the ground under it from its suzerain's **own domain and from every
 * other vassal of that suzerain** it covers (the dev, 2026-11-12, Hum over Serbia, both Duklja's: *"it must carve
 * the suzerain, or a vassal if the ground was held by a vassal"* — replacing the rule of 2026-10-15, which left a
 * co-vassal overlapped). Nothing outside the suzerain's extent is carved: what lies there stays the vassal's,
 * overlapping, hatched. Nothing already drawn is recomputed.
 *
 * Two steps, on the document's own anchors so the new limit is **shared**, never copied:
 *
 * 1. **Crossings** — where the new outline crosses one of a domain's segments between two anchors, an anchor is
 *    placed at the crossing and inserted in every ring running over either segment.
 * 2. **The difference** — the domain's area minus the outline's, by `polygon-clipping` (the clipping the hatches
 *    use), its vertices written back as the anchors they sit on. **It never refuses on a shape** (the dev, same
 *    evening, *"think of Illustrator"*: Pathfinder's Minus Front): the walk of segments it replaces refused
 *    Croatia in Hungary and Bosnia in Serbia, *"an anchor ends an odd number of segments"*, wherever a limit ran
 *    along another without sharing its anchors.
 */

import polygonClipping from 'polygon-clipping'

import { MIN_RING_ANCHORS } from '../data/yearDocument'

import { edgeAt, everyRing, runStepAt } from './anchorEdits'
import { addAnchor, addOutline } from './documentEdits'
import { extentMembers } from './extent'

import type { OutlinePoint } from './documentEdits'
import type { YearDocument } from '../data/yearDocument'
import type { YearClaim } from '../data/yearFormat'
import type { MultiPolygon, Polygon } from 'polygon-clipping'

/** What a carving did — for the status bar, and for a test to read. */
export interface Carving {
  /** The suzerain whose own domain was carved. */
  suzerain: string
  /** How many anchors were placed where the new outline crossed the suzerain's limit. */
  crossings: number
  /** How many rings the suzerain's own domain holds afterwards. */
  rings: number
}

/** Why a carving did not happen, when something should have. */
export interface CarvingFault {
  /** The suzerain whose domain was left as it was — the document is put back as it was before the carving. */
  suzerain: string
  /** What went wrong, for the console. */
  reason: string
}

/**
 * A carving held back: the suzerain's own outline is still open, and a carving reads closed areas (the dev, 2026-11-05:
 * the suzerain is not carved while its outline is open, and a warning dialogue says so — `open-outlines.md`). The
 * vassal and the suzerain overlap until it is closed.
 */
export interface CarvingHeld {
  /** The suzerain left uncarved. */
  suzerain: string
  /** Why. */
  held: 'open-outline'
}

/** A crossing found on a segment: where along it, and the anchor placed there. */
interface Crossing {
  /** How far along the segment, from its first anchor, 0 to 1. */
  along: number
  /** The anchor placed at the crossing. */
  anchor: number
}

/** How close to an end a crossing may sit before it is taken for the end itself. */
const END_TOLERANCE = 1e-9

/** How close, in degrees, a vertex of the difference may sit to an anchor to be that anchor — about a millimetre. */
const SAME_POINT_DEGREES = 1e-8

/**
 * Under this area, in km², a ring the difference leaves is a crumb of rounding between two limits that run side by
 * side, and is dropped — the measure of the script that carved Croatia and Bosnia by hand on 2026-11-12.
 */
const CRUMB_KM2 = 0.5

/** Kilometres in a degree of latitude, for a rough area. */
const KM_PER_DEGREE = 111

/**
 * The suzerain a vassal's outline could not be carved out of, because its own outline is open — asked **before** the
 * vassal is closed: the closing is refused then, nothing written (the dev, 2026-11-05: a vassal is never left over a
 * suzerain it cannot be carved from — `open-outlines.md`).
 * @param doc - the document
 * @param vassalId - the polity about to be closed
 * @returns the suzerain's id, or `null` when the closing may go on
 */
export function openSuzerainOf(doc: YearDocument, vassalId: string): string | null {
  const suzerain = doc.polities.find((polity) => polity.id === vassalId)?.suzerain ?? null
  if (suzerain === null) return null
  const domain = ownDomainOf(doc, suzerain)
  return domain !== null && 'held' in domain ? suzerain : null
}

/**
 * Close an outline for a polity and carve it out of its suzerain's own domain — what the Pen does at close,
 * in one edit so one undo takes both back.
 * @param doc - the document
 * @param polityId - who the outline is drawn for
 * @param points - the outline's points, closure implied
 * @returns `closed: false` when the document refused the outline — and nothing was written; otherwise what
 *   the carving did, `null` when there was nothing to carve
 */
export function addOutlineCarving(
  doc: YearDocument,
  polityId: string,
  points: readonly OutlinePoint[]
): { closed: false } | { closed: true; carving: Carving | CarvingFault | CarvingHeld | null } {
  if (!addOutline(doc, polityId, points, false)) return { closed: false }
  const ring = doc.claims.find((claim) => claim.polity === polityId)?.rings.at(-1)
  // `addOutline` has just pushed this ring: its absence is a defect, reported as a fault, never skipped.
  if (ring === undefined) {
    const suzerain = doc.polities.find((polity) => polity.id === polityId)?.suzerain ?? polityId
    return {
      closed: true,
      carving: { suzerain, reason: 'the closed outline is not in the document' },
    }
  }
  return { closed: true, carving: carveOutOfSuzerain(doc, polityId, ring) }
}

/**
 * A suzerain's own domain, if it has one and it can be carved.
 * @param doc - the document
 * @param suzerain - the suzerain's id
 * @returns its claim; `null` with no own domain; held back when one of its outlines is open
 */
function ownDomainOf(doc: YearDocument, suzerain: string): YearClaim | CarvingHeld | null {
  const claim = doc.claims.find((each) => each.polity === suzerain)
  if (claim === undefined || claim.rings.length === 0) return null
  return claim.open === undefined ? claim : { suzerain, held: 'open-outline' }
}

/**
 * Carve a vassal's newly closed outline out of its suzerain's own domain.
 * @param doc - the document, the outline already closed into it
 * @param vassalId - the polity whose outline was closed
 * @param ring - the outline's anchors — the ring as it sits in the document, edited in place by crossings
 * @returns what was carved; `null` when there was nothing to carve (no suzerain, no own domain, no overlap);
 *   a fault when it could not be done — and then the document is exactly as it was before the call:
 *   crossing anchors already placed are taken back out (review QUAL-001, 2026-10-15); held back, and nothing
 *   written, when the suzerain's own outline is open (`CarvingHeld`)
 */
export function carveOutOfSuzerain(
  doc: YearDocument,
  vassalId: string,
  ring: number[]
): Carving | CarvingFault | CarvingHeld | null {
  const suzerain = doc.polities.find((polity) => polity.id === vassalId)?.suzerain ?? null
  if (suzerain === null) return null
  const own = ownDomainOf(doc, suzerain)
  if (own !== null && 'held' in own) return own

  const putBack = snapshotOf(doc)
  let done: { crossings: number; carved: number } | string
  try {
    done = carveHosts(doc, hostsOf(doc, suzerain, vassalId), ring)
  } catch (error) {
    // polygon-clipping throws on a shape it cannot read: the gesture is refused whole, said as a fault.
    done = clippingFault(error)
  }
  if (typeof done === 'string') {
    putBack()
    return { suzerain, reason: done }
  }
  if (done.carved === 0) return null
  return { suzerain, crossings: done.crossings, rings: own === null ? 0 : own.rings.length }
}

/**
 * What a carving refused by the clipping says.
 * @param error - what `polygon-clipping` threw
 * @returns the fault's reason
 */
function clippingFault(error: unknown): string {
  return `the difference could not be computed: ${error instanceof Error ? error.message : String(error)}`
}

/**
 * Take an outline out of each domain it covers, in turn: its crossings placed, then the difference written.
 * @param doc - the document
 * @param hosts - the claims to carve
 * @param ring - the outline
 * @returns how many crossings were placed and domains carved, or why a crossing could not be placed — the caller
 *   puts the document back
 */
function carveHosts(
  doc: YearDocument,
  hosts: readonly YearClaim[],
  ring: number[]
): { crossings: number; carved: number } | string {
  let crossings = 0
  let carved = 0
  for (const host of hosts) {
    if (!overlapsArea(doc, host.rings, ring)) continue
    const placed = placeCrossings(doc, host.rings, ring)
    if (typeof placed === 'string') return placed
    crossings += placed
    host.rings = differenceOf(doc, host.rings, ring)
    carved += 1
  }
  return { crossings, carved }
}

/**
 * The claims a vassal's new outline takes ground from: its suzerain's own domain, then every other vassal of
 * that suzerain at any depth — never the vassal itself nor its own vassals (the dev, 2026-11-12: *"it must carve
 * the suzerain, or a vassal if the ground was held by a vassal"*). A co-vassal whose outline is open reads no area,
 * and is left as it is.
 * @param doc - the document
 * @param suzerain - the suzerain's id
 * @param vassalId - the vassal whose outline was closed
 * @returns the closed claims to carve, the suzerain's first
 */
function hostsOf(doc: YearDocument, suzerain: string, vassalId: string): YearClaim[] {
  const own = new Set(extentMembers(doc, vassalId))
  return extentMembers(doc, suzerain)
    .filter((id) => !own.has(id))
    .flatMap((id) => {
      const claim = doc.claims.find((each) => each.polity === id)
      return claim !== undefined && claim.rings.length > 0 && claim.open === undefined
        ? [claim]
        : []
    })
}

/**
 * Some rings as the region they fill by the even-odd rule, in the document's coordinates.
 * @param doc - the document
 * @param rings - the rings, as anchor indices
 * @returns the region
 */
function regionOf(doc: YearDocument, rings: readonly number[][]): MultiPolygon {
  const at = (index: number): [number, number] | undefined => doc.anchors[index]
  const polygons: Polygon[] = rings.flatMap((each) => {
    const points = resolve(each, at)
    const head = points[0]
    return points.length >= MIN_RING_ANCHORS && head !== undefined ? [[[...points, head]]] : []
  })
  const [first, ...rest] = polygons
  if (first === undefined) return []
  return rest.length === 0 ? [first] : polygonClipping.xor(first, ...rest)
}

/**
 * Whether an outline covers some of a domain's ground — touching along a limit is not covering.
 * @param doc - the document
 * @param rings - the domain's rings
 * @param ring - the outline
 * @returns `true` when the two share an area
 */
function overlapsArea(
  doc: YearDocument,
  rings: readonly number[][],
  ring: readonly number[]
): boolean {
  const outline = regionOf(doc, [[...ring]])
  const domain = regionOf(doc, rings)
  if (outline.length === 0 || domain.length === 0) return false
  return polygonClipping.intersection(domain, outline).some((polygon) => polygonArea(polygon) > 0)
}

/**
 * A domain's rings once an outline is taken out of them, written in the document's anchors: a vertex of the
 * difference that is an anchor of either — the crossings placed before included — is that anchor, so the new
 * limit is **shared** with the outline; one that is none (the clipping's own crossing of two lines the
 * crossings did not see, along a shared line) becomes a new anchor, with the source of the nearest one. Rings the
 * clipping leaves under `CRUMB_KM2` — where two limits run a rounding apart — are dropped.
 * @param doc - the document, anchors added to
 * @param rings - the domain's rings
 * @param ring - the outline taken out
 * @returns the domain's new rings
 */
function differenceOf(
  doc: YearDocument,
  rings: readonly number[][],
  ring: readonly number[]
): number[][] {
  const result = polygonClipping.difference(regionOf(doc, rings), regionOf(doc, [[...ring]]))
  const candidates = [...new Set([...rings.flat(), ...ring])]
  const byPosition = new Map<string, number>()
  for (const index of candidates) {
    const point = doc.anchors[index]
    if (point !== undefined) byPosition.set(`${String(point[0])},${String(point[1])}`, index)
  }
  const anchorAt = (point: [number, number]): number => {
    const found = byPosition.get(`${String(point[0])},${String(point[1])}`)
    if (found !== undefined) return found
    const nearest = nearestAnchor(doc, candidates, point)
    if (nearest !== null && nearest.distance <= SAME_POINT_DEGREES) return nearest.index
    const created = addAnchor(
      doc,
      point,
      nearest === null ? 0 : (doc.anchorSource[nearest.index] ?? 0)
    )
    byPosition.set(`${String(point[0])},${String(point[1])}`, created)
    return created
  }
  return result
    .flatMap((polygon) =>
      polygon.map((each) =>
        withoutRepeats(each.slice(0, -1).map((point) => anchorAt([point[0], point[1]])))
      )
    )
    .filter((each) => each.length >= MIN_RING_ANCHORS && ringKm2(doc, each) >= CRUMB_KM2)
}

/**
 * The anchor among some candidates nearest a point.
 * @param doc - the document
 * @param candidates - the anchor indices to look among
 * @param point - the point
 * @returns the nearest anchor and its distance in degrees, or `null` with no candidate
 */
function nearestAnchor(
  doc: YearDocument,
  candidates: readonly number[],
  point: [number, number]
): { index: number; distance: number } | null {
  let best: { index: number; distance: number } | null = null
  for (const index of candidates) {
    const at = doc.anchors[index]
    if (at === undefined) continue
    const distance = Math.hypot(at[0] - point[0], at[1] - point[1])
    if (best === null || distance < best.distance) best = { index, distance }
  }
  return best
}

/**
 * A run of anchors with its consecutive repeats dropped, the closing pair included.
 * @param run - the anchors
 * @returns the run, no anchor equal to the one before it
 */
function withoutRepeats(run: readonly number[]): number[] {
  const kept = run.filter((at, i) => i === 0 || at !== run[i - 1])
  while (kept.length > 1 && kept[0] === kept.at(-1)) kept.pop()
  return kept
}

/**
 * A polygon's area in square degrees, its holes taken out.
 * @param polygon - the outer ring then its holes, each closed
 * @returns the area, never negative
 */
function polygonArea(polygon: Polygon): number {
  const [outer, ...holes] = polygon.map((each) => Math.abs(shoelace(each)))
  return Math.max(0, (outer ?? 0) - holes.reduce((sum, hole) => sum + hole, 0))
}

/**
 * A ring's signed area by the shoelace formula, in the units of its points.
 * @param points - the ring's points, closed or not
 * @returns the signed area
 */
function shoelace(points: readonly (readonly number[])[]): number {
  let sum = 0
  points.forEach((point, k) => {
    const next = points[(k + 1) % points.length]
    if (next !== undefined)
      sum += (point[0] ?? 0) * (next[1] ?? 0) - (next[0] ?? 0) * (point[1] ?? 0)
  })
  return sum / 2
}

/**
 * A ring's area in km², roughly — enough to tell a crumb of rounding from ground.
 * @param doc - the document
 * @param ring - the ring, as anchor indices
 * @returns the area
 */
function ringKm2(doc: YearDocument, ring: readonly number[]): number {
  const points = resolve(ring, (index) => doc.anchors[index])
  const latitude = points[0]?.[1] ?? 0
  return (
    Math.abs(shoelace(points)) *
    KM_PER_DEGREE *
    KM_PER_DEGREE *
    Math.cos((latitude * Math.PI) / 180)
  )
}

/**
 * What the carving may change — every ring and dressed run, the anchors and their sources — and a way to put
 * it all back, so a carving that fails leaves nothing behind.
 * @param doc - the document
 * @returns the function that restores the document
 */
function snapshotOf(doc: YearDocument): () => void {
  const rings = everyRing(doc).map((live) => [live, [...live]] as const)
  const runs = doc.runs.map((dressed) => [dressed.run, [...dressed.run]] as const)
  // A domain carved gets new rings, not its old ones edited: which rings each claim held is put back too.
  const held = doc.claims.map((claim) => [claim, claim.rings] as const)
  const anchors = doc.anchors.length
  const sources = doc.anchorSource.length
  return () => {
    for (const [claim, list] of held) claim.rings = list
    for (const [live, copy] of [...rings, ...runs]) live.splice(0, live.length, ...copy)
    doc.anchors.length = anchors
    doc.anchorSource.length = sources
  }
}

/**
 * Every segment of some rings, each once whichever way it is walked.
 * @param rings - the rings, closure implied
 * @returns the segments, as pairs of anchors
 */
function candidateSegments(rings: readonly number[][]): [number, number][] {
  const found = new Map<string, [number, number]>()
  for (const ring of rings) {
    if (ring.length < MIN_RING_ANCHORS) continue
    for (const [from, to] of segmentsOf(ring)) found.set(keyOf(from, to), [from, to])
  }
  return [...found.values()]
}

/**
 * Every pair of segments to test for a crossing: one of the outline's against one of the domain's, never
 * two sharing an anchor — those meet at it, they do not cross.
 * @param ring - the new outline
 * @param domain - the suzerain's rings
 * @returns the pairs, as `[a, b, c, d]`
 */
function pairsToTest(
  ring: readonly number[],
  domain: readonly number[][]
): [number, number, number, number][] {
  // Each segment once (review ARCH-102): a ring walking one segment out and back would find its crossing
  // twice, and place two anchors where the limits cross once.
  const own = candidateSegments(domain)
  return candidateSegments([[...ring]]).flatMap(([a, b]) =>
    own
      .filter(([c, d]) => a !== c && a !== d && b !== c && b !== d)
      .map(([c, d]) => [a, b, c, d] as [number, number, number, number])
  )
}

/**
 * Place an anchor wherever the new outline crosses a suzerain segment between anchors, and insert it in
 * every ring running over either segment — the suzerain's, the outline's, and a neighbour sharing them.
 * @param doc - the document
 * @param domain - the suzerain's rings
 * @param ring - the new outline
 * @returns how many anchors were placed, or why one could not be — the caller puts the document back
 */
function placeCrossings(
  doc: YearDocument,
  domain: readonly number[][],
  ring: readonly number[]
): number | string {
  const onSegment = new Map<string, { from: number; to: number; crossings: Crossing[] }>()
  const note = (from: number, to: number, crossing: Crossing): void => {
    const key = `${String(from)}>${String(to)}`
    const found = onSegment.get(key)
    if (found) found.crossings.push(crossing)
    else onSegment.set(key, { from, to, crossings: [crossing] })
  }
  let placed = 0
  for (const [a, b, c, d] of pairsToTest(ring, domain)) {
    const hit = crossingOf(doc.anchors[a], doc.anchors[b], doc.anchors[c], doc.anchors[d])
    if (hit === null) continue
    // The crossing lies on the suzerain's limit, so it takes that limit's source — never a substitute.
    const sourceId = doc.anchorSource[c]
    if (sourceId === undefined) return `anchor ${String(c)} of the suzerain has no source`
    const anchor = addAnchor(doc, hit.point, sourceId)
    placed += 1
    note(a, b, { along: hit.alongFirst, anchor })
    note(c, d, { along: hit.alongSecond, anchor })
  }
  for (const { from, to, crossings } of onSegment.values()) {
    const ordered = [...crossings].sort((x, y) => x.along - y.along).map((each) => each.anchor)
    insertAlong(doc, from, to, ordered)
  }
  return placed
}

/**
 * Insert anchors, ordered from `from` to `to`, on that segment of every ring and dressed run holding it.
 * @param doc - the document
 * @param from - the segment's first anchor
 * @param to - its second
 * @param ordered - the anchors to insert, in order from `from`
 */
function insertAlong(
  doc: YearDocument,
  from: number,
  to: number,
  ordered: readonly number[]
): void {
  for (const each of everyRing(doc)) {
    // Every ring as closed: a carving reads areas, an open outline's closing line among its segments.
    const position = edgeAt(each, from, to, false)
    if (position < 0) continue
    const forward = each[position] === from
    each.splice(position + 1, 0, ...(forward ? ordered : [...ordered].reverse()))
  }
  for (const dressed of doc.runs) {
    const position = runStepAt(dressed.run, from, to)
    if (position < 0) continue
    const forward = dressed.run[position] === from
    dressed.run.splice(position + 1, 0, ...(forward ? ordered : [...ordered].reverse()))
  }
}

/**
 * A ring's segments, closure included, as pairs of anchors.
 * @param ring - the ring, as anchor indices
 * @returns `[from, to]` per segment, a zero-length one skipped; empty below two anchors
 */
function segmentsOf(ring: readonly number[]): [number, number][] {
  if (ring.length < 2) return []
  return ring.flatMap((from, position) => {
    const to = ring[(position + 1) % ring.length]
    return to === undefined || to === from ? [] : [[from, to] as [number, number]]
  })
}

/**
 * Whether a position along a segment lies strictly inside it, its two ends excluded.
 * @param t - the position along the segment, `0` at its start and `1` at its end
 * @returns `true` when it is farther than `END_TOLERANCE` from both ends
 */
const inside = (t: number): boolean => t > END_TOLERANCE && t < 1 - END_TOLERANCE

/**
 * Where two segments cross strictly inside both — not at an end, not along a shared line.
 * @param a - the first segment's start
 * @param b - its end
 * @param c - the second segment's start
 * @param d - its end
 * @returns the crossing and how far along each segment it lies, or `null`
 */
function crossingOf(
  a: [number, number] | undefined,
  b: [number, number] | undefined,
  c: [number, number] | undefined,
  d: [number, number] | undefined
): { point: [number, number]; alongFirst: number; alongSecond: number } | null {
  if (a === undefined || b === undefined || c === undefined || d === undefined) return null
  const rx = b[0] - a[0]
  const ry = b[1] - a[1]
  const sx = d[0] - c[0]
  const sy = d[1] - c[1]
  const denominator = rx * sy - ry * sx
  if (denominator === 0) return null
  const qx = c[0] - a[0]
  const qy = c[1] - a[1]
  const alongFirst = (qx * sy - qy * sx) / denominator
  const alongSecond = (qx * ry - qy * rx) / denominator
  if (!inside(alongFirst) || !inside(alongSecond)) return null
  return { point: [a[0] + alongFirst * rx, a[1] + alongFirst * ry], alongFirst, alongSecond }
}

/**
 * A ring's anchors as coordinates, a missing index skipped.
 * @param ring - the ring, as anchor indices
 * @param at - the coordinates of an anchor index, or `undefined` when it has none
 * @returns the coordinates in ring order, without the indices `at` did not know
 */
function resolve(
  ring: readonly number[],
  at: (index: number) => [number, number] | undefined
): [number, number][] {
  return ring.flatMap((index) => {
    const point = at(index)
    return point === undefined ? [] : [point]
  })
}

/**
 * The key of an unordered segment.
 * @param a - one end's anchor index
 * @param b - the other end's anchor index
 * @returns `low:high`, the same whichever end comes first
 */
function keyOf(a: number, b: number): string {
  return a < b ? `${String(a)}:${String(b)}` : `${String(b)}:${String(a)}`
}
